import { Pinecone } from '@pinecone-database/pinecone';
import { kv } from '@vercel/kv';
import { EllenSessionStorage } from '../storage/ellen-session-storage';

const sessionStorage = new EllenSessionStorage();

async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) return null;
  const endpoint = process.env.VOYAGE_EMBEDDINGS_URL || 'https://api.voyageai.com/v1/embeddings';
  const model = process.env.VOYAGE_EMBEDDINGS_MODEL || 'voyage-3';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ input: text, model })
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  return data?.data?.[0]?.embedding || null;
}

export async function processConversationEmbed(payload: { sessionId: string; userId: string }) {
  const pineconeKey = process.env.PINECONE_API_KEY;
  if (!pineconeKey) {
    console.warn('[conversation-embed] Missing PINECONE_API_KEY, skipping');
    return;
  }

  const session = await sessionStorage.getSession(payload.sessionId);
  if (!session || !session.messages?.length) return;

  const cursorKey = `ellen:session:${payload.sessionId}:embed-cursor`;
  const lastId = (await kv.get<string>(cursorKey)) || '';
  const startIndex = lastId ? session.messages.findIndex(m => m.id === lastId) + 1 : 0;
  const pending = session.messages.slice(Math.max(0, startIndex));
  if (!pending.length) return;

  const pinecone = new Pinecone({ apiKey: pineconeKey });
  const indexName = process.env.PINECONE_CONVERSATIONS_INDEX || 'mookti-conversations';
  const index = pinecone.index(indexName);
  const namespace = `conversations:user:${payload.userId}`;

  for (const msg of pending) {
    const text = (msg.content || '').toString();
    if (!text) continue;
    const embedding = await embedText(text);
    if (!embedding) continue;
    const id = `${payload.sessionId}:${msg.id}`;
    await index.namespace(namespace).upsert([{ id, values: embedding as any, metadata: {
      text,
      role: msg.role,
      sessionId: payload.sessionId,
      timestamp: msg.timestamp?.toISOString?.() || new Date().toISOString()
    }}]);
    await kv.set(cursorKey, msg.id);
  }
}

