import { verifyFirebaseToken } from '../../lib/auth-native';
import { Pinecone } from '@pinecone-database/pinecone';

export const config = {
  runtime: 'edge',
};

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'DELETE') {
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
    const { docId } = await req.json();
    
    if (!docId) {
      return new Response(
        JSON.stringify({ error: 'Missing document ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify document ownership
    const kv = await import('@vercel/kv').then(m => m.kv);
    const docMetadata = await kv.get(`doc_${docId}`);
    
    if (!docMetadata) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const doc = docMetadata as any;
    if (doc.userId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to delete this document' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete from Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
    const namespace = `u_${userId}`;
    
    // Delete all chunks for this document
    const chunkIds = [];
    for (let i = 0; i < doc.chunks; i++) {
      chunkIds.push(`${docId}_chunk_${i}`);
    }
    
    if (chunkIds.length > 0) {
      await index.namespace(namespace).deleteMany(chunkIds);
    }

    // Delete document metadata
    await kv.del(`doc_${docId}`);

    // Audit log
    console.log(`Document ${docId} deleted by user ${userId} at ${new Date().toISOString()}`);
    
    // Store deletion record for compliance
    await kv.set(
      `deletion_${docId}`,
      {
        docId,
        userId,
        fileName: doc.fileName,
        deletedAt: new Date().toISOString(),
        reason: 'user_requested',
      },
      { ex: 2592000 } // Keep for 30 days
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document successfully deleted',
        docId,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Document deletion error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}