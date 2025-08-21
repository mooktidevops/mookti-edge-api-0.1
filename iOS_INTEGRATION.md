# iOS App Integration Guide

## Quick Start

### 1. Update API Configuration

In your iOS app, update the API base URL:

```swift
// In your API configuration file
let API_BASE_URL = "https://mookti-edge-api-0-1.vercel.app/api"
```

### 2. Firebase Authentication Setup

Ensure Firebase Auth is configured and get the ID token:

```swift
import FirebaseAuth

func getAuthToken(completion: @escaping (String?) -> Void) {
    Auth.auth().currentUser?.getIDToken { token, error in
        if let error = error {
            print("Error getting token: \(error)")
            completion(nil)
        } else {
            completion(token)
        }
    }
}
```

### 3. API Service Implementation

Create an API service class:

```swift
class MooktiAPIService {
    static let shared = MooktiAPIService()
    private let baseURL = "https://mookti-edge-api-0-1.vercel.app/api"
    
    // Search for educational content
    func search(query: String, completion: @escaping (Result<SearchResponse, Error>) -> Void) {
        getAuthToken { token in
            guard let token = token else {
                completion(.failure(APIError.authenticationRequired))
                return
            }
            
            let url = URL(string: "\(self.baseURL)/search")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body = [
                "query": query,
                "topK": 5,
                "includeUserDocs": false
            ]
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
            
            URLSession.shared.dataTask(with: request) { data, response, error in
                // Handle response
            }.resume()
        }
    }
    
    // Chat with Ellen AI
    func chat(message: String, history: [ChatMessage], completion: @escaping (Result<ChatResponse, Error>) -> Void) {
        getAuthToken { token in
            guard let token = token else {
                completion(.failure(APIError.authenticationRequired))
                return
            }
            
            let url = URL(string: "\(self.baseURL)/chat")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body = [
                "message": message,
                "chatHistory": history.map { ["role": $0.role, "content": $0.content] },
                "currentNodeId": "1",
                "useRAG": true
            ]
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
            
            URLSession.shared.dataTask(with: request) { data, response, error in
                // Handle response
            }.resume()
        }
    }
}
```

### 4. FormativeToolMessageView Integration

Update your FormativeToolMessageView to use the new API:

```swift
class FormativeToolMessageView: UIView {
    
    func sendMessage(_ message: String) {
        // Show loading indicator
        showLoading()
        
        // Call the chat API
        MooktiAPIService.shared.chat(
            message: message,
            history: self.chatHistory
        ) { result in
            DispatchQueue.main.async {
                self.hideLoading()
                
                switch result {
                case .success(let response):
                    // Display Ellen's response
                    self.displayResponse(response.message)
                    
                    // Update chat history
                    self.chatHistory.append(ChatMessage(role: "user", content: message))
                    self.chatHistory.append(ChatMessage(role: "assistant", content: response.message))
                    
                case .failure(let error):
                    // Handle error
                    self.showError("Failed to get response: \(error.localizedDescription)")
                }
            }
        }
    }
}
```

### 5. Progress Tracking

Sync user progress as they navigate through content:

```swift
func syncProgress(pathId: String, currentNode: String, completedNodes: [String]) {
    getAuthToken { token in
        guard let token = token else { return }
        
        let url = URL(string: "\(self.baseURL)/progress/sync")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "path_id": pathId,
            "current_node": currentNode,
            "completed_nodes": completedNodes,
            "module_progress": [:],
            "time_spent": 60 // seconds
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { _, _, _ in
            // Progress synced silently in background
        }.resume()
    }
}
```

## Testing Checklist

- [ ] Firebase Auth configured in iOS app
- [ ] User can sign in/sign up
- [ ] API calls include Firebase ID token
- [ ] Search returns relevant results
- [ ] Chat with Ellen works
- [ ] Progress syncs correctly
- [ ] Error handling for network failures
- [ ] Loading states shown during API calls

## Error Handling

Handle common API errors:

```swift
enum APIError: Error {
    case authenticationRequired
    case rateLimitExceeded
    case networkError
    case serverError(String)
    
    var userMessage: String {
        switch self {
        case .authenticationRequired:
            return "Please sign in to continue"
        case .rateLimitExceeded:
            return "Too many requests. Please wait a moment."
        case .networkError:
            return "Check your internet connection"
        case .serverError(let message):
            return "Something went wrong: \(message)"
        }
    }
}
```

## Rate Limiting

The API enforces rate limits based on user plan:
- Free: 10 requests/minute
- Plus: 30 requests/minute
- Pro: 100 requests/minute

Implement client-side throttling:

```swift
class RateLimiter {
    private var lastRequestTime: Date?
    private let minimumInterval: TimeInterval = 6.0 // For free tier (10/min)
    
    func shouldAllowRequest() -> Bool {
        guard let last = lastRequestTime else {
            lastRequestTime = Date()
            return true
        }
        
        let interval = Date().timeIntervalSince(last)
        if interval >= minimumInterval {
            lastRequestTime = Date()
            return true
        }
        return false
    }
}
```

## Monitoring During Beta

Monitor API usage and errors:
- Dashboard: https://mookti-edge-api-0-1.vercel.app/monitor.html
- Check Vercel logs for errors
- Track user feedback on response quality

## Support

For API issues during beta testing:
- Check API status: GET /api/monitoring/redis-stats
- Review logs in Vercel dashboard
- Contact: [your-email@example.com]