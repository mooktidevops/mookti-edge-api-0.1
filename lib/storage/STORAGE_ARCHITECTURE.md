# Mookti Storage Architecture

## Overview
Complete storage solution using existing Redis (Upstash KV) and Pinecone infrastructure.

## Storage Layers

### 1. Redis/KV (Upstash) - Session & Transient Data
- **Chat Sessions**: Active chat state, temporary message buffer
- **User Sessions**: Auth tokens, preferences, active state
- **Progress Tracking**: Real-time learning progress
- **Gamification State**: Streaks, active goals, daily stats
- **Cache**: Frequently accessed data, API responses

### 2. Pinecone - Vector Storage & Semantic Search
- **Message Embeddings**: All user/assistant messages for semantic search
- **Learning Content**: Embedded learning materials (already exists)
- **User Documents**: Uploaded PDFs, notes (already exists)
- **Conversation History**: Searchable chat history with context

### 3. Structured Data Requirements
Instead of Postgres, we'll use Redis with structured keys:

#### Users
```
user:{userId} -> {
  id: string,
  email: string,
  name: string,
  type: 'free' | 'basic' | 'pro',
  createdAt: timestamp,
  preferences: {...}
}
```

#### Chats
```
chat:{chatId} -> {
  id: string,
  userId: string,
  title: string,
  createdAt: timestamp,
  visibility: 'public' | 'private',
  lastMessageAt: timestamp
}

user:{userId}:chats -> Set of chatIds (for listing)
```

#### Messages
```
chat:{chatId}:messages -> List of message objects
chat:{chatId}:message:{messageId} -> {
  id: string,
  role: 'user' | 'assistant',
  content: string,
  parts: array,
  createdAt: timestamp,
  embedding?: vector (stored in Pinecone)
}
```

#### Documents/Artifacts
```
user:{userId}:documents -> Set of documentIds
document:{documentId} -> {
  id: string,
  userId: string,
  title: string,
  content: string,
  kind: 'text' | 'code' | 'image' | 'sheet',
  createdAt: timestamp
}
```

#### Gamification
```
user:{userId}:streak -> {
  current: number,
  lastActivity: timestamp,
  longestStreak: number
}

user:{userId}:goals -> Set of active goals
goal:{goalId} -> {
  id: string,
  userId: string,
  title: string,
  progress: number,
  dueDate: timestamp
}
```

## Implementation Plan

### Phase 1: Core Storage Services
1. Create `StorageService` class with Redis and Pinecone clients
2. Implement user management methods
3. Implement chat/message storage methods
4. Add embedding generation for messages

### Phase 2: API Endpoints
1. `/api/storage/chat` - Create, read, update chats
2. `/api/storage/message` - Store and retrieve messages
3. `/api/storage/user` - User profile management
4. `/api/storage/search` - Semantic search across conversations

### Phase 3: Webapp Integration
1. Replace Drizzle queries with API calls
2. Update auth to use Redis sessions
3. Implement real-time updates via Redis pub/sub

## Benefits
- No additional database setup required
- Uses existing infrastructure
- Scales with Redis and Pinecone tiers
- Semantic search capabilities built-in
- Real-time capabilities via Redis

## Migration Path
1. Start with new chats using this system
2. Optionally migrate existing data later
3. Remove Postgres/SQLite dependencies