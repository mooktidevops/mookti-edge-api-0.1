import { verifyFirebaseToken } from '../../lib/auth-native';
import { EntitlementsManager } from '../../src/entitlements/manager';
import crypto from 'crypto';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    const authResult = await verifyFirebaseToken(authHeader);
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify(authResult.error),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    
    // Parse request
    const { fileName, fileSize, fileType } = await req.json();
    
    if (!fileName || !fileSize || !fileType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get entitlements
    const entitlements = await EntitlementsManager.getInstance().getUserEntitlements(userId);
    
    // Check upload permissions
    if (!entitlements.plan.features.uploads_enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'Uploads not available in your plan',
          upgrade_url: '/settings/billing'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check file size limit
    const maxSizeMB = entitlements.plan.features.upload_size_limit_mb;
    const fileSizeMB = fileSize / (1024 * 1024);
    
    if (fileSizeMB > maxSizeMB) {
      return new Response(
        JSON.stringify({ 
          error: `File size exceeds limit of ${maxSizeMB}MB`,
          file_size_mb: fileSizeMB,
          limit_mb: maxSizeMB
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check daily upload limit
    const dailyLimit = entitlements.plan.features.daily_upload_limit;
    const uploadsToday = entitlements.usage.uploads_today;
    
    if (uploadsToday >= dailyLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Daily upload limit reached (${dailyLimit} files)`,
          resets_at: new Date(Date.now() + 86400000).toISOString()
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure upload URL and document ID
    const docId = `doc_${userId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const uploadToken = crypto.randomBytes(32).toString('hex');
    
    // Store upload token in KV (expires in 1 hour)
    const kv = await import('@vercel/kv').then(m => m.kv);
    await kv.set(
      `upload_token_${uploadToken}`,
      {
        userId,
        docId,
        fileName,
        fileSize,
        fileType,
        expiresAt: Date.now() + 3600000, // 1 hour
      },
      { ex: 3600 } // Redis expiry
    );

    // Generate signed URL for direct upload
    // In production, this will use the Vercel deployment URL automatically
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const uploadUrl = `${baseUrl}/api/uploads/ingest?token=${uploadToken}`;

    return new Response(
      JSON.stringify({
        uploadUrl,
        docId,
        expiresIn: 3600,
        limits: {
          max_size_mb: maxSizeMB,
          daily_uploads_remaining: dailyLimit - uploadsToday - 1,
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Signed URL generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}