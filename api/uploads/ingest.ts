import '../../lib/edge-polyfills';
import { Pinecone } from '@pinecone-database/pinecone';
import { VoyageAIClient } from 'voyageai';
import { EntitlementsManager } from '../../src/entitlements/manager';

export const config = {
  runtime: 'edge',
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY!,
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify upload token
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing upload token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve token data from KV
    const kv = await import('@vercel/kv').then(m => m.kv);
    const tokenData = await kv.get(`upload_token_${token}`);
    
    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId, docId, fileName, fileType } = tokenData as any;

    // Parse multipart form data or raw text
    let content: string;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      content = await file.text();
    } else {
      content = await req.text();
    }

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Empty file content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process document into chunks
    const chunks = chunkDocument(content, 1000); // 1000 char chunks with overlap
    
    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await voyage.embed({
          input: chunk.text,
          model: 'voyage-large-2-instruct',
        });
        
        if (!response.data || response.data.length === 0) {
          throw new Error('Failed to generate embedding');
        }
        
        return {
          text: chunk.text,
          embedding: response.data[0].embedding,
          metadata: chunk.metadata,
        };
      })
    );

    // Prepare vectors for Pinecone - ensure values is always defined
    const vectors = embeddings.map((item, index) => ({
      id: `${docId}_chunk_${index}`,
      values: item.embedding || [], // Ensure values is never undefined
      metadata: {
        doc_id: docId,
        chunk_index: index,
        text: item.text,
        file_name: fileName,
        file_type: fileType,
        user_id: userId,
        created_at: new Date().toISOString(),
        ...item.metadata,
      },
    }));

    // Upsert to user's namespace in Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
    const namespace = `u_${userId}`;
    
    await index.namespace(namespace).upsert(vectors);

    // Log usage
    await EntitlementsManager.getInstance().logUsage(userId, 'upload', 1);

    // Delete the upload token
    await kv.del(`upload_token_${token}`);

    // Store document metadata
    await kv.set(
      `doc_${docId}`,
      {
        id: docId,
        userId,
        fileName,
        fileType,
        chunks: chunks.length,
        createdAt: new Date().toISOString(),
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        docId,
        chunks: chunks.length,
        message: 'Document successfully ingested and indexed',
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Document ingestion error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to ingest document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function chunkDocument(
  text: string, 
  chunkSize: number = 1000,
  overlap: number = 200
): Array<{ text: string; metadata: any }> {
  const chunks: Array<{ text: string; metadata: any }> = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  let chunkStart = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          chunk_start: chunkStart,
          chunk_end: i - 1,
        },
      });
      
      // Start new chunk with overlap
      const overlapSentences = [];
      let overlapLength = 0;
      for (let j = i - 1; j >= 0 && overlapLength < overlap; j--) {
        overlapSentences.unshift(sentences[j]);
        overlapLength += sentences[j].length;
        if (overlapLength >= overlap) break;
      }
      
      currentChunk = overlapSentences.join(' ') + ' ' + sentence;
      chunkStart = i - overlapSentences.length + 1;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: {
        chunk_start: chunkStart,
        chunk_end: sentences.length - 1,
      },
    });
  }
  
  return chunks;
}