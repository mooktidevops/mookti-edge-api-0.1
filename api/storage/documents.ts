import '../../lib/polyfills';
import databaseStorage from '../../src/lib/db/storage-service';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  
  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    if (method === 'GET') {
      const documentId = url.searchParams.get('documentId');
      
      if (!documentId) {
        return new Response(JSON.stringify({ error: 'documentId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const document = await databaseStorage.getDocumentById(documentId);
      if (!document) {
        return new Response(JSON.stringify({ error: 'Document not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(document), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'POST') {
      const body: any = await request.json() as { userId?: string; [key: string]: any };
      const { userId, title, content, kind } = body;
      
      if (!userId || !title) {
        return new Response(JSON.stringify({ error: 'userId and title are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const document = await databaseStorage.createDocument(
        userId,
        title,
        content || null,
        kind || 'text'
      );
      
      return new Response(JSON.stringify(document), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (method === 'DELETE') {
      const documentId = url.searchParams.get('documentId');
      
      if (!documentId) {
        return new Response(JSON.stringify({ error: 'documentId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const deleted = await databaseStorage.deleteDocument(documentId);
      
      return new Response(JSON.stringify({ success: deleted }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Storage API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}