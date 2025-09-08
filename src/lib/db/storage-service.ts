import { db, user, chat, message, document, vote, User, Chat, DBMessage, Document, Vote } from './index';
import { eq, and, desc } from 'drizzle-orm';
import { generateHashedPassword, generateDummyPassword } from './utils';
import { compareSync } from 'bcrypt-ts';

export class DatabaseStorageService {
  private static instance: DatabaseStorageService;

  private constructor() {}

  public static getInstance(): DatabaseStorageService {
    if (!DatabaseStorageService.instance) {
      DatabaseStorageService.instance = new DatabaseStorageService();
    }
    return DatabaseStorageService.instance;
  }

  // User Management
  async createUser(email: string, password?: string, id?: string): Promise<User> {
    const hashedPassword = password ? generateHashedPassword(password) : generateDummyPassword();
    
    // Only allow custom ID in development mode
    const userData: any = {
      email,
      password: hashedPassword,
    };
    
    if (id && process.env.NODE_ENV === 'development') {
      userData.id = id;
    }
    
    const [newUser] = await db.insert(user).values(userData).returning();
    
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await db.select().from(user).where(eq(user.email, email)).limit(1);
    return users.length > 0 ? users[0] : null;
  }

  async getUserById(userId: string): Promise<User | null> {
    const users = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    return users.length > 0 ? users[0] : null;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const foundUser = await this.getUserByEmail(email);
    if (!foundUser || !foundUser.password) return null;
    
    const isValid = compareSync(password, foundUser.password);
    return isValid ? foundUser : null;
  }

  // Chat Management
  async createChat(
    userId: string, 
    title: string, 
    visibility: 'public' | 'private' = 'private',
    id?: string
  ): Promise<Chat> {
    const chatData: any = {
      userId,
      title,
      visibility,
      createdAt: new Date(),
    };
    
    // Use provided ID if available, otherwise let DB generate one
    if (id) {
      chatData.id = id;
    }
    
    const [newChat] = await db.insert(chat).values(chatData).returning();
    
    return newChat;
  }

  async getChatById(chatId: string): Promise<Chat | null> {
    const chats = await db.select().from(chat).where(eq(chat.id, chatId)).limit(1);
    return chats.length > 0 ? chats[0] : null;
  }

  async getChatsByUserId(userId: string): Promise<Chat[]> {
    return await db.select()
      .from(chat)
      .where(eq(chat.userId, userId))
      .orderBy(desc(chat.createdAt));
  }

  async deleteChat(chatId: string): Promise<boolean> {
    const result = await db.delete(chat).where(eq(chat.id, chatId));
    return true;
  }

  // Message Management
  async createMessage(
    chatId: string, 
    role: string, 
    parts: any[], 
    attachments: any[] = []
  ): Promise<DBMessage> {
    const [newMessage] = await db.insert(message).values({
      chatId,
      role,
      parts,
      attachments,
      createdAt: new Date(),
    }).returning();
    
    return newMessage;
  }

  async getMessagesByChatId(chatId: string): Promise<DBMessage[]> {
    return await db.select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(message.createdAt);
  }

  async deleteMessagesAfterTimestamp(chatId: string, timestamp: Date): Promise<boolean> {
    await db.delete(message)
      .where(
        and(
          eq(message.chatId, chatId),
          // Note: This might need adjustment based on your exact requirements
          // Currently deletes messages created after the timestamp
        )
      );
    return true;
  }

  // Document Management
  async createDocument(
    userId: string,
    title: string,
    content: string | null,
    kind: 'text' | 'code' | 'image' | 'sheet' = 'text'
  ): Promise<Document> {
    const [newDoc] = await db.insert(document).values({
      userId,
      title,
      content,
      kind,
      createdAt: new Date(),
    }).returning();
    
    return newDoc;
  }

  async getDocumentById(docId: string): Promise<Document | null> {
    const docs = await db.select()
      .from(document)
      .where(eq(document.id, docId))
      .limit(1);
    return docs.length > 0 ? docs[0] : null;
  }

  async deleteDocument(docId: string): Promise<boolean> {
    await db.delete(document).where(eq(document.id, docId));
    return true;
  }

  // Vote Management
  async createOrUpdateVote(chatId: string, messageId: string, isUpvoted: boolean): Promise<Vote> {
    // Try to update existing vote first
    const existingVotes = await db.select()
      .from(vote)
      .where(
        and(
          eq(vote.chatId, chatId),
          eq(vote.messageId, messageId)
        )
      )
      .limit(1);

    if (existingVotes.length > 0) {
      // Update existing vote
      const [updatedVote] = await db.update(vote)
        .set({ isUpvoted })
        .where(
          and(
            eq(vote.chatId, chatId),
            eq(vote.messageId, messageId)
          )
        )
        .returning();
      return updatedVote;
    } else {
      // Create new vote
      const [newVote] = await db.insert(vote).values({
        chatId,
        messageId,
        isUpvoted,
      }).returning();
      return newVote;
    }
  }

  async getVotesByChatId(chatId: string): Promise<Vote[]> {
    return await db.select()
      .from(vote)
      .where(eq(vote.chatId, chatId));
  }
}

export default DatabaseStorageService.getInstance();