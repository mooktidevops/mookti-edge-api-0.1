# Mookti Edge API v0.1 Documentation

## Base URL
Production: `https://mookti-edge-api-0-1.vercel.app/api`

## Authentication
All endpoints (except monitoring and search-test) require Firebase authentication.
Include the Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

## Endpoints

### 1. Vector Search
**POST** `/search`

Search for relevant educational content using semantic similarity.

**Request Body:**
```json
{
  "query": "What is calculus?",
  "topK": 5,
  "includeUserDocs": false
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "CORE-CALC-101",
      "content": "...",
      "score": 0.95,
      "metadata": {
        "domain": "STEM",
        "subdomain": "Calculus",
        "title": "Introduction to Limits"
      }
    }
  ]
}
```

### 2. Chat with AI Tutor
**POST** `/chat`

Engage with Ellen, the AI tutor, with RAG-enhanced responses.

**Request Body:**
```json
{
  "message": "Explain derivatives",
  "chatHistory": [],
  "currentNodeId": "1",
  "useRAG": true
}
```

**Response:**
```json
{
  "response": "Let me explain derivatives...",
  "context": ["relevant content chunks"],
  "tools_used": []
}
```

### 3. Learning Paths

#### Get All Learning Paths
**GET** `/learning-paths`

**Response:**
```json
{
  "learning_paths": [
    {
      "id": "workplace_success",
      "name": "Workplace Success",
      "description": "Cultural Intelligence Learning Path",
      "node_count": 200,
      "estimated_duration": "4 hours"
    }
  ],
  "total": 1,
  "version": "1.0.0"
}
```

#### Get Specific Learning Path
**GET** `/learning-paths/{pathId}`

**Query Parameters:**
- `include_content=true` - Include full node content

**Response:**
```json
{
  "id": "workplace_success",
  "name": "Workplace Success",
  "modules": ["intro", "cq_intro", ...],
  "nodes": {
    "1": {
      "id": "1",
      "title": "Welcome",
      "content_id": "CORE-WORKPLACE-001"
    }
  }
}
```

### 4. Progress Tracking

#### Get Progress
**GET** `/progress/{pathId}`

**Response:**
```json
{
  "user_id": "user123",
  "path_id": "workplace_success",
  "current_node": "5",
  "completed_nodes": ["1", "2", "3", "4"],
  "module_progress": {
    "intro": 100,
    "cq_intro": 50
  },
  "last_updated": "2024-01-20T10:30:00Z",
  "total_time_spent": 3600
}
```

#### Sync Progress
**POST** `/progress/sync`

**Request Body:**
```json
{
  "path_id": "workplace_success",
  "current_node": "6",
  "completed_nodes": ["1", "2", "3", "4", "5"],
  "module_progress": {
    "intro": 100,
    "cq_intro": 75
  },
  "time_spent": 300
}
```

### 5. Document Upload

#### Get Signed Upload URL
**POST** `/uploads/signed-url`

**Request Body:**
```json
{
  "fileName": "notes.pdf",
  "fileSize": 1048576,
  "fileType": "application/pdf"
}
```

**Response:**
```json
{
  "uploadUrl": "https://...",
  "docId": "doc_user123_12345_abc",
  "expiresIn": 3600,
  "limits": {
    "max_size_mb": 10,
    "daily_uploads_remaining": 9
  }
}
```

#### Delete Document
**DELETE** `/uploads/delete`

**Request Body:**
```json
{
  "docId": "doc_user123_12345_abc"
}
```

### 6. Monitoring (No Auth Required)

#### Redis Stats
**GET** `/monitoring/redis-stats`

**Headers:**
```
Authorization: Bearer beta-monitoring-2024
```

**Response:**
```json
{
  "stats": {
    "commands_today": 1250,
    "storage_used_mb": 0.5,
    "daily_limit": 10000,
    "usage_percentage": 12.5
  },
  "alerts": [],
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### 7. Test Endpoint (No Auth Required)
**POST** `/search-test`

Test search functionality without authentication (for development only).

**Request Body:**
```json
{
  "query": "What is calculus?",
  "topK": 3,
  "namespace": "public"
}
```

## Rate Limits

Based on user plan (Free/Plus/Pro):
- **Free**: 10 requests/minute, 100/day
- **Plus**: 30 requests/minute, 1000/day  
- **Pro**: 100 requests/minute, 10000/day

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Missing or invalid authorization header",
  "code": "AUTH_HEADER_MISSING"
}
```

### 429 Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "code": "SERVER_ERROR",
  "details": "Error message"
}
```

## iOS Integration Steps

1. **Install Firebase SDK** and configure authentication
2. **Get Firebase ID Token**:
```swift
Auth.auth().currentUser?.getIDToken { token, error in
    // Use token for API calls
}
```

3. **Make API Calls**:
```swift
let url = URL(string: "https://mookti-edge-api-0-1.vercel.app/api/search")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try JSONEncoder().encode(searchRequest)
```

## Environment Variables Required

Set these in Vercel Dashboard:
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `FIREBASE_PROJECT_ID`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Beta Testing Checklist

- [x] Vector search operational (1,080+ vectors indexed)
- [x] Authentication configured and working
- [x] All endpoints deployed and responding
- [x] Monitoring dashboard accessible
- [x] Rate limiting configured
- [ ] iOS app Firebase authentication setup
- [ ] FormativeToolMessageView wired to chat endpoint
- [ ] End-to-end testing with real users

## Support

For issues or questions during beta testing:
- Monitor dashboard: https://mookti-edge-api-0-1.vercel.app/monitor.html
- Redis stats: GET /api/monitoring/redis-stats
- Vercel logs: Check deployment logs in Vercel dashboard