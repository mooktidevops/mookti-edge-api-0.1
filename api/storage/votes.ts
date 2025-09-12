import '../../lib/polyfills';
import databaseStorage from '../../src/lib/db/storage-service';
import { verifyApiAuth as verifyAuth, requireAuth, requireOwnership } from '../../lib/auth/middleware';
import { isDevMode, logDev } from '../../lib/config/dev-mode';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;

  // CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Auth
  const user = await verifyAuth(request);

  try {
    if (method === 'GET') {
      const chatId = url.searchParams.get('chatId');
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'chatId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Ownership check (allow bypass in dev)
      const chat = await databaseStorage.getChatById(chatId);
      if (!chat) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const ownershipError = requireOwnership(user, chat.userId, request);
      if (ownershipError) return ownershipError;

      const votes = await databaseStorage.getVotesByChatId(chatId);
      return new Response(JSON.stringify(votes), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      const authError = requireAuth(user);
      if (authError) return authError;

      const body = (await request.json()) as {
        chatId?: string;
        messageId?: string;
        isUpvoted?: boolean;
      };
      const { chatId, messageId, isUpvoted } = body;

      if (!chatId || !messageId || typeof isUpvoted !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'chatId, messageId and isUpvoted are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Ownership check (allow bypass in dev)
      const chat = await databaseStorage.getChatById(chatId);
      if (!chat) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const ownershipError = requireOwnership(user, chat.userId, request);
      if (ownershipError) return ownershipError;

      const vote = await databaseStorage.createOrUpdateVote(
        chatId,
        messageId,
        isUpvoted,
      );
      return new Response(JSON.stringify(vote), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Votes API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

