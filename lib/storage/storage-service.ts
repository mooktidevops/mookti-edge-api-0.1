import { kv } from '@vercel/kv';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import { VoyageAIClient } from 'voyageai';

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Get Pinecone index
const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');

// Initialize Voyage AI client for embeddings
const voyageClient = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY!,
});

// Type definitions
export interface User {
  id: string;
  email: string;
  name: string;
  type: 'free' | 'basic' | 'pro';
  createdAt: number;
  preferences?: Record<string, any>;
  selectedModel?: string;
  selectedProvider?: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  visibility: 'public' | 'private';
  lastMessageAt: number;
  model?: string;
  provider?: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: any[];
  createdAt: number;
  model?: string;
  provider?: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  createdAt: number;
}

export interface Streak {
  current: number;
  lastActivity: number;
  longestStreak: number;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  progress: number;
  dueDate: number;
  createdAt: number;
}

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // User Management
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    
    await kv.set(`user:${user.id}`, user);
    await kv.set(`user:email:${user.email}`, user.id);
    
    return user;
  }

  async getUser(userId: string): Promise<User | null> {
    return await kv.get<User>(`user:${userId}`);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const userId = await kv.get<string>(`user:email:${email}`);
    if (!userId) return null;
    return await this.getUser(userId);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUser(userId);
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates };
    await kv.set(`user:${userId}`, updatedUser);
    
    return updatedUser;
  }

  // Chat Management
  async createChat(userId: string, title: string = 'New Chat'): Promise<Chat> {
    const chat: Chat = {
      id: uuidv4(),
      userId,
      title,
      createdAt: Date.now(),
      visibility: 'private',
      lastMessageAt: Date.now(),
    };
    
    await kv.set(`chat:${chat.id}`, chat);
    await kv.sadd(`user:${userId}:chats`, chat.id);
    
    return chat;
  }

  async getChat(chatId: string): Promise<Chat | null> {
    return await kv.get<Chat>(`chat:${chatId}`);
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    const chatIds = await kv.smembers(`user:${userId}:chats`);
    if (!chatIds || chatIds.length === 0) return [];
    
    const chats = await Promise.all(
      chatIds.map(id => this.getChat(id as string))
    );
    
    return chats
      .filter(chat => chat !== null)
      .sort((a, b) => b!.lastMessageAt - a!.lastMessageAt) as Chat[];
  }

  async updateChat(chatId: string, updates: Partial<Chat>): Promise<Chat | null> {
    const chat = await this.getChat(chatId);
    if (!chat) return null;
    
    const updatedChat = { ...chat, ...updates };
    await kv.set(`chat:${chatId}`, updatedChat);
    
    return updatedChat;
  }

  async deleteChat(chatId: string): Promise<boolean> {
    const chat = await this.getChat(chatId);
    if (!chat) return false;
    
    // Remove from user's chat list
    await kv.srem(`user:${chat.userId}:chats`, chatId);
    
    // Delete chat and messages
    await kv.del(`chat:${chatId}`);
    await kv.del(`chat:${chatId}:messages`);
    
    // Delete message embeddings from Pinecone
    try {
      await pineconeIndex.namespace('conversations').deleteMany({
        chatId: { $eq: chatId }
      });
    } catch (error) {
      console.error('Error deleting embeddings:', error);
    }
    
    return true;
  }

  // Message Management
  async addMessage(chatId: string, message: Omit<Message, 'id' | 'chatId' | 'createdAt'>): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      chatId,
      createdAt: Date.now(),
    };
    
    // Store message in Redis
    await kv.rpush(`chat:${chatId}:messages`, newMessage);
    await kv.set(`chat:${chatId}:message:${newMessage.id}`, newMessage);
    
    // Update chat's last message time
    await this.updateChat(chatId, { lastMessageAt: newMessage.createdAt });
    
    // Generate and store embedding if it's a user message
    if (message.role === 'user') {
      try {
        await this.storeMessageEmbedding(newMessage);
      } catch (error) {
        console.error('Error storing embedding:', error);
      }
    }
    
    return newMessage;
  }

  async getMessages(chatId: string, limit?: number): Promise<Message[]> {
    const messages = await kv.lrange<Message>(`chat:${chatId}:messages`, 0, limit ? limit - 1 : -1);
    return messages || [];
  }

  async getMessage(chatId: string, messageId: string): Promise<Message | null> {
    return await kv.get<Message>(`chat:${chatId}:message:${messageId}`);
  }

  async deleteMessagesByChatIdAfterTimestamp(chatId: string, timestamp: Date): Promise<number> {
    // Get all messages for the chat
    const messages = await this.getMessages(chatId);
    
    let deletedCount = 0;
    const timestampMs = timestamp.getTime();
    
    // Filter and delete messages after the timestamp
    for (const message of messages) {
      const messageTime = new Date(message.createdAt).getTime();
      if (messageTime > timestampMs) {
        // Remove from the list
        await kv.lrem(`chat:${chatId}:messages`, 0, message);
        // Remove individual message key if it exists
        await kv.del(`chat:${chatId}:message:${message.id}`);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Embedding Management
  private async storeMessageEmbedding(message: Message): Promise<void> {
    try {
      // Generate embedding using Voyage AI
      const embeddingResponse = await voyageClient.embed({
        input: [message.content],
        model: 'voyage-2',
      });
      
      if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
        throw new Error('No embedding generated');
      }
      
      // Store in Pinecone
      const embedding = embeddingResponse.data[0].embedding;
      if (!embedding) {
        throw new Error('No embedding generated for message');
      }
      
      const chat = await this.getChat(message.chatId);
      await pineconeIndex.namespace('conversations').upsert([
        {
          id: message.id,
          values: embedding,
          metadata: {
            chatId: message.chatId,
            userId: chat?.userId || '',
            content: message.content.substring(0, 1000), // Truncate for metadata
            role: message.role,
            createdAt: message.createdAt,
          },
        },
      ]);
    } catch (error) {
      console.error('Error generating/storing embedding:', error);
      throw error;
    }
  }

  async searchConversations(userId: string, query: string, limit: number = 10): Promise<any[]> {
    try {
      // Get user's chat IDs
      const chatIds = await kv.smembers(`user:${userId}:chats`);
      if (!chatIds || chatIds.length === 0) return [];
      
      // Generate embedding for query using Voyage AI
      const embeddingResponse = await voyageClient.embed({
        input: [query],
        model: 'voyage-2',
      });
      
      if (!embeddingResponse.data || embeddingResponse.data.length === 0) {
        throw new Error('No embedding generated for query');
      }
      
      // Search in Pinecone
      const queryEmbedding = embeddingResponse.data[0].embedding;
      if (!queryEmbedding) {
        throw new Error('No embedding generated for search query');
      }
      
      const results = await pineconeIndex.namespace('conversations').query({
        vector: queryEmbedding,
        topK: limit,
        filter: {
          userId: { $eq: userId },
        },
        includeMetadata: true,
      });
      
      return results.matches || [];
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  // Document Management
  async createDocument(userId: string, doc: Omit<Document, 'id' | 'userId' | 'createdAt'>): Promise<Document> {
    const document: Document = {
      ...doc,
      id: uuidv4(),
      userId,
      createdAt: Date.now(),
    };
    
    await kv.set(`document:${document.id}`, document);
    await kv.sadd(`user:${userId}:documents`, document.id);
    
    return document;
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return await kv.get<Document>(`document:${documentId}`);
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    const docIds = await kv.smembers(`user:${userId}:documents`);
    if (!docIds || docIds.length === 0) return [];
    
    const docs = await Promise.all(
      docIds.map(id => this.getDocument(id as string))
    );
    
    return docs
      .filter(doc => doc !== null)
      .sort((a, b) => b!.createdAt - a!.createdAt) as Document[];
  }

  // Gamification
  async getStreak(userId: string): Promise<Streak> {
    const streak = await kv.get<Streak>(`user:${userId}:streak`);
    return streak || { current: 0, lastActivity: 0, longestStreak: 0 };
  }

  async updateStreak(userId: string, updates: Partial<Streak>): Promise<Streak> {
    const streak = await this.getStreak(userId);
    const updatedStreak = { ...streak, ...updates };
    await kv.set(`user:${userId}:streak`, updatedStreak);
    return updatedStreak;
  }

  async createGoal(userId: string, goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>): Promise<Goal> {
    const newGoal: Goal = {
      ...goal,
      id: uuidv4(),
      userId,
      createdAt: Date.now(),
    };
    
    await kv.set(`goal:${newGoal.id}`, newGoal);
    await kv.sadd(`user:${userId}:goals`, newGoal.id);
    
    return newGoal;
  }

  async getUserGoals(userId: string): Promise<Goal[]> {
    const goalIds = await kv.smembers(`user:${userId}:goals`);
    if (!goalIds || goalIds.length === 0) return [];
    
    const goals = await Promise.all(
      goalIds.map(id => kv.get<Goal>(`goal:${id}`))
    );
    
    return goals
      .filter(goal => goal !== null)
      .sort((a, b) => a!.dueDate - b!.dueDate) as Goal[];
  }

  // Session Management
  async createSession(userId: string, token: string, expiresIn: number = 86400): Promise<void> {
    await kv.setex(`session:${token}`, expiresIn, userId);
  }

  async getSession(token: string): Promise<string | null> {
    return await kv.get<string>(`session:${token}`);
  }

  async deleteSession(token: string): Promise<void> {
    await kv.del(`session:${token}`);
  }

  // Suggestions/Votes (for webapp compatibility)
  async createSuggestion(userId: string, documentId: string, suggestion: any): Promise<any> {
    const suggestionId = uuidv4();
    const suggestionData = {
      id: suggestionId,
      userId,
      documentId,
      ...suggestion,
      createdAt: Date.now(),
    };
    
    await kv.set(`suggestion:${suggestionId}`, suggestionData);
    await kv.sadd(`document:${documentId}:suggestions`, suggestionId);
    
    return suggestionData;
  }

  async voteSuggestion(suggestionId: string, userId: string, isUpvote: boolean): Promise<void> {
    const voteKey = `suggestion:${suggestionId}:votes`;
    const userVoteKey = `user:${userId}:votes`;
    
    // Remove any existing vote
    await kv.srem(voteKey, userId);
    
    // Add new vote
    if (isUpvote) {
      await kv.sadd(voteKey, userId);
      await kv.sadd(userVoteKey, suggestionId);
    } else {
      await kv.srem(userVoteKey, suggestionId);
    }
  }
}

export default StorageService.getInstance();