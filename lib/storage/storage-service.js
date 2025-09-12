"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const kv_1 = require("@vercel/kv");
const pinecone_1 = require("@pinecone-database/pinecone");
const uuid_1 = require("uuid");
const voyageai_1 = require("voyageai");
// Initialize Pinecone client
const pinecone = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
// Get Pinecone index
const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME || 'mookti-vectors');
// Initialize Voyage AI client for embeddings
const voyageClient = new voyageai_1.VoyageAIClient({
    apiKey: process.env.VOYAGE_API_KEY,
});
class StorageService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }
    // User Management
    async createUser(userData) {
        const user = {
            ...userData,
            id: (0, uuid_1.v4)(),
            createdAt: Date.now(),
        };
        await kv_1.kv.set(`user:${user.id}`, user);
        await kv_1.kv.set(`user:email:${user.email}`, user.id);
        return user;
    }
    async getUser(userId) {
        return await kv_1.kv.get(`user:${userId}`);
    }
    async getUserByEmail(email) {
        const userId = await kv_1.kv.get(`user:email:${email}`);
        if (!userId)
            return null;
        return await this.getUser(userId);
    }
    async updateUser(userId, updates) {
        const user = await this.getUser(userId);
        if (!user)
            return null;
        const updatedUser = { ...user, ...updates };
        await kv_1.kv.set(`user:${userId}`, updatedUser);
        return updatedUser;
    }
    // Chat Management
    async createChat(userId, title = 'New Chat') {
        const chat = {
            id: (0, uuid_1.v4)(),
            userId,
            title,
            createdAt: Date.now(),
            visibility: 'private',
            lastMessageAt: Date.now(),
        };
        await kv_1.kv.set(`chat:${chat.id}`, chat);
        await kv_1.kv.sadd(`user:${userId}:chats`, chat.id);
        return chat;
    }
    async getChat(chatId) {
        return await kv_1.kv.get(`chat:${chatId}`);
    }
    async getUserChats(userId) {
        const chatIds = await kv_1.kv.smembers(`user:${userId}:chats`);
        if (!chatIds || chatIds.length === 0)
            return [];
        const chats = await Promise.all(chatIds.map(id => this.getChat(id)));
        return chats
            .filter(chat => chat !== null)
            .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    }
    async updateChat(chatId, updates) {
        const chat = await this.getChat(chatId);
        if (!chat)
            return null;
        const updatedChat = { ...chat, ...updates };
        await kv_1.kv.set(`chat:${chatId}`, updatedChat);
        return updatedChat;
    }
    async deleteChat(chatId) {
        const chat = await this.getChat(chatId);
        if (!chat)
            return false;
        // Remove from user's chat list
        await kv_1.kv.srem(`user:${chat.userId}:chats`, chatId);
        // Delete chat and messages
        await kv_1.kv.del(`chat:${chatId}`);
        await kv_1.kv.del(`chat:${chatId}:messages`);
        // Delete message embeddings from Pinecone
        try {
            await pineconeIndex.namespace('conversations').deleteMany({
                chatId: { $eq: chatId }
            });
        }
        catch (error) {
            console.error('Error deleting embeddings:', error);
        }
        return true;
    }
    // Message Management
    async addMessage(chatId, message) {
        const newMessage = {
            ...message,
            id: (0, uuid_1.v4)(),
            chatId,
            createdAt: Date.now(),
        };
        // Store message in Redis
        await kv_1.kv.rpush(`chat:${chatId}:messages`, newMessage);
        await kv_1.kv.set(`chat:${chatId}:message:${newMessage.id}`, newMessage);
        // Update chat's last message time
        await this.updateChat(chatId, { lastMessageAt: newMessage.createdAt });
        // Generate and store embedding if it's a user message
        if (message.role === 'user') {
            try {
                await this.storeMessageEmbedding(newMessage);
            }
            catch (error) {
                console.error('Error storing embedding:', error);
            }
        }
        return newMessage;
    }
    async getMessages(chatId, limit) {
        const messages = await kv_1.kv.lrange(`chat:${chatId}:messages`, 0, limit ? limit - 1 : -1);
        return messages || [];
    }
    async getMessage(chatId, messageId) {
        return await kv_1.kv.get(`chat:${chatId}:message:${messageId}`);
    }
    async deleteMessagesByChatIdAfterTimestamp(chatId, timestamp) {
        // Get all messages for the chat
        const messages = await this.getMessages(chatId);
        let deletedCount = 0;
        const timestampMs = timestamp.getTime();
        // Filter and delete messages after the timestamp
        for (const message of messages) {
            const messageTime = new Date(message.createdAt).getTime();
            if (messageTime > timestampMs) {
                // Remove from the list
                await kv_1.kv.lrem(`chat:${chatId}:messages`, 0, message);
                // Remove individual message key if it exists
                await kv_1.kv.del(`chat:${chatId}:message:${message.id}`);
                deletedCount++;
            }
        }
        return deletedCount;
    }
    // Embedding Management
    async storeMessageEmbedding(message) {
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
        }
        catch (error) {
            console.error('Error generating/storing embedding:', error);
            throw error;
        }
    }
    async searchConversations(userId, query, limit = 10) {
        try {
            // Get user's chat IDs
            const chatIds = await kv_1.kv.smembers(`user:${userId}:chats`);
            if (!chatIds || chatIds.length === 0)
                return [];
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
        }
        catch (error) {
            console.error('Error searching conversations:', error);
            return [];
        }
    }
    // Document Management
    async createDocument(userId, doc) {
        const document = {
            ...doc,
            id: (0, uuid_1.v4)(),
            userId,
            createdAt: Date.now(),
        };
        await kv_1.kv.set(`document:${document.id}`, document);
        await kv_1.kv.sadd(`user:${userId}:documents`, document.id);
        return document;
    }
    async getDocument(documentId) {
        return await kv_1.kv.get(`document:${documentId}`);
    }
    async getUserDocuments(userId) {
        const docIds = await kv_1.kv.smembers(`user:${userId}:documents`);
        if (!docIds || docIds.length === 0)
            return [];
        const docs = await Promise.all(docIds.map(id => this.getDocument(id)));
        return docs
            .filter(doc => doc !== null)
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    // Gamification
    async getStreak(userId) {
        const streak = await kv_1.kv.get(`user:${userId}:streak`);
        return streak || { current: 0, lastActivity: 0, longestStreak: 0 };
    }
    async updateStreak(userId, updates) {
        const streak = await this.getStreak(userId);
        const updatedStreak = { ...streak, ...updates };
        await kv_1.kv.set(`user:${userId}:streak`, updatedStreak);
        return updatedStreak;
    }
    async createGoal(userId, goal) {
        const newGoal = {
            ...goal,
            id: (0, uuid_1.v4)(),
            userId,
            createdAt: Date.now(),
        };
        await kv_1.kv.set(`goal:${newGoal.id}`, newGoal);
        await kv_1.kv.sadd(`user:${userId}:goals`, newGoal.id);
        return newGoal;
    }
    async getUserGoals(userId) {
        const goalIds = await kv_1.kv.smembers(`user:${userId}:goals`);
        if (!goalIds || goalIds.length === 0)
            return [];
        const goals = await Promise.all(goalIds.map(id => kv_1.kv.get(`goal:${id}`)));
        return goals
            .filter(goal => goal !== null)
            .sort((a, b) => a.dueDate - b.dueDate);
    }
    // Session Management
    async createSession(userId, token, expiresIn = 86400) {
        await kv_1.kv.setex(`session:${token}`, expiresIn, userId);
    }
    async getSession(token) {
        return await kv_1.kv.get(`session:${token}`);
    }
    async deleteSession(token) {
        await kv_1.kv.del(`session:${token}`);
    }
    // Suggestions/Votes (for webapp compatibility)
    async createSuggestion(userId, documentId, suggestion) {
        const suggestionId = (0, uuid_1.v4)();
        const suggestionData = {
            id: suggestionId,
            userId,
            documentId,
            ...suggestion,
            createdAt: Date.now(),
        };
        await kv_1.kv.set(`suggestion:${suggestionId}`, suggestionData);
        await kv_1.kv.sadd(`document:${documentId}:suggestions`, suggestionId);
        return suggestionData;
    }
    async voteSuggestion(suggestionId, userId, isUpvote) {
        const voteKey = `suggestion:${suggestionId}:votes`;
        const userVoteKey = `user:${userId}:votes`;
        // Remove any existing vote
        await kv_1.kv.srem(voteKey, userId);
        // Add new vote
        if (isUpvote) {
            await kv_1.kv.sadd(voteKey, userId);
            await kv_1.kv.sadd(userVoteKey, suggestionId);
        }
        else {
            await kv_1.kv.srem(userVoteKey, suggestionId);
        }
    }
}
exports.StorageService = StorageService;
exports.default = StorageService.getInstance();
