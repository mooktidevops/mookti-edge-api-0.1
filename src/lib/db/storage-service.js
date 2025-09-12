"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseStorageService = void 0;
const index_1 = require("./index");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("./utils");
const bcrypt_ts_1 = require("bcrypt-ts");
class DatabaseStorageService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DatabaseStorageService.instance) {
            DatabaseStorageService.instance = new DatabaseStorageService();
        }
        return DatabaseStorageService.instance;
    }
    // User Management
    async createUser(email, password, id) {
        const hashedPassword = password ? (0, utils_1.generateHashedPassword)(password) : (0, utils_1.generateDummyPassword)();
        // Only allow custom ID in development mode
        const userData = {
            email,
            password: hashedPassword,
        };
        if (id && process.env.NODE_ENV === 'development') {
            userData.id = id;
        }
        const [newUser] = await index_1.db.insert(index_1.user).values(userData).returning();
        return newUser;
    }
    async getUserByEmail(email) {
        const users = await index_1.db.select().from(index_1.user).where((0, drizzle_orm_1.eq)(index_1.user.email, email)).limit(1);
        return users.length > 0 ? users[0] : null;
    }
    async getUserById(userId) {
        const users = await index_1.db.select().from(index_1.user).where((0, drizzle_orm_1.eq)(index_1.user.id, userId)).limit(1);
        return users.length > 0 ? users[0] : null;
    }
    async verifyPassword(email, password) {
        const foundUser = await this.getUserByEmail(email);
        if (!foundUser || !foundUser.password)
            return null;
        const isValid = (0, bcrypt_ts_1.compareSync)(password, foundUser.password);
        return isValid ? foundUser : null;
    }
    // Chat Management
    async createChat(userId, title, visibility = 'private', id) {
        const chatData = {
            userId,
            title,
            visibility,
            createdAt: new Date(),
        };
        // Use provided ID if available, otherwise let DB generate one
        if (id) {
            chatData.id = id;
        }
        const [newChat] = await index_1.db.insert(index_1.chat).values(chatData).returning();
        return newChat;
    }
    async getChatById(chatId) {
        const chats = await index_1.db.select().from(index_1.chat).where((0, drizzle_orm_1.eq)(index_1.chat.id, chatId)).limit(1);
        return chats.length > 0 ? chats[0] : null;
    }
    async getChatsByUserId(userId) {
        return await index_1.db.select()
            .from(index_1.chat)
            .where((0, drizzle_orm_1.eq)(index_1.chat.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(index_1.chat.createdAt));
    }
    async deleteChat(chatId) {
        const result = await index_1.db.delete(index_1.chat).where((0, drizzle_orm_1.eq)(index_1.chat.id, chatId));
        return true;
    }
    // Message Management
    async createMessage(chatId, role, parts, attachments = []) {
        const [newMessage] = await index_1.db.insert(index_1.message).values({
            chatId,
            role,
            parts,
            attachments,
            createdAt: new Date(),
        }).returning();
        return newMessage;
    }
    async getMessagesByChatId(chatId) {
        return await index_1.db.select()
            .from(index_1.message)
            .where((0, drizzle_orm_1.eq)(index_1.message.chatId, chatId))
            .orderBy(index_1.message.createdAt);
    }
    async deleteMessagesAfterTimestamp(chatId, timestamp) {
        await index_1.db.delete(index_1.message)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.message.chatId, chatId)));
        return true;
    }
    // Document Management
    async createDocument(userId, title, content, kind = 'text') {
        const [newDoc] = await index_1.db.insert(index_1.document).values({
            userId,
            title,
            content,
            kind,
            createdAt: new Date(),
        }).returning();
        return newDoc;
    }
    async getDocumentById(docId) {
        const docs = await index_1.db.select()
            .from(index_1.document)
            .where((0, drizzle_orm_1.eq)(index_1.document.id, docId))
            .limit(1);
        return docs.length > 0 ? docs[0] : null;
    }
    async deleteDocument(docId) {
        await index_1.db.delete(index_1.document).where((0, drizzle_orm_1.eq)(index_1.document.id, docId));
        return true;
    }
    // Vote Management
    async createOrUpdateVote(chatId, messageId, isUpvoted) {
        // Try to update existing vote first
        const existingVotes = await index_1.db.select()
            .from(index_1.vote)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.vote.chatId, chatId), (0, drizzle_orm_1.eq)(index_1.vote.messageId, messageId)))
            .limit(1);
        if (existingVotes.length > 0) {
            // Update existing vote
            const [updatedVote] = await index_1.db.update(index_1.vote)
                .set({ isUpvoted })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_1.vote.chatId, chatId), (0, drizzle_orm_1.eq)(index_1.vote.messageId, messageId)))
                .returning();
            return updatedVote;
        }
        else {
            // Create new vote
            const [newVote] = await index_1.db.insert(index_1.vote).values({
                chatId,
                messageId,
                isUpvoted,
            }).returning();
            return newVote;
        }
    }
    async getVotesByChatId(chatId) {
        return await index_1.db.select()
            .from(index_1.vote)
            .where((0, drizzle_orm_1.eq)(index_1.vote.chatId, chatId));
    }
}
exports.DatabaseStorageService = DatabaseStorageService;
exports.default = DatabaseStorageService.getInstance();
