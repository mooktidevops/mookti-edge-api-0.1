# Mookti Edge API

Edge functions for Mookti MVP providing secure access to Claude API and vector search.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file for local development:
```
ANTHROPIC_API_KEY=sk-ant-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
FIREBASE_PROJECT_ID=mookti-mvp
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### 3. Install Vercel CLI
```bash
npm install -g vercel
```

### 4. Run Locally
```bash
npm run dev
# or
vercel dev
```

## Deployment

### First Time Setup
```bash
vercel
```

Follow the prompts to:
1. Link to your Vercel account
2. Set up a new project
3. Configure environment variables

### Deploy to Production
```bash
npm run deploy
# or
vercel --prod
```

### Set Environment Variables in Vercel
```bash
# One by one
vercel env add ANTHROPIC_API_KEY
vercel env add PINECONE_API_KEY
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add FIREBASE_PRIVATE_KEY
```

## API Endpoints

### POST /api/claude
Direct Claude API proxy with authentication.

Request:
```json
{
  "prompt": "User's question",
  "systemPrompt": "Optional system instructions",
  "temperature": 0.6,
  "maxTokens": 2048
}
```

### POST /api/search
Vector similarity search (requires embeddings).

Request:
```json
{
  "query": "[embedding array]",
  "topK": 5
}
```

### POST /api/chat
Combined RAG + Claude chat (recommended).

Request:
```json
{
  "message": "User's message",
  "chatHistory": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ],
  "useRAG": true,
  "topK": 5
}
```

## iOS App Integration

Update `CloudAIService.swift`:
```swift
// Change base URL
private static let baseURL = "https://your-vercel-app.vercel.app/api/chat"

// Add Firebase auth token
if let user = Auth.auth().currentUser {
    let token = try await user.getIDToken()
    request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
}
```

## Security

- All endpoints require Firebase Authentication
- API keys are stored server-side only
- CORS is configured for your app
- Rate limiting per user (coming soon)

## Monitoring

View logs and analytics at:
https://vercel.com/your-username/mookti-edge-api

## Next Steps

1. Set up Voyage AI for embedding generation
2. Implement proper rate limiting with Vercel KV
3. Add response caching
4. Set up error monitoring (Sentry)