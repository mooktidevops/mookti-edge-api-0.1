// Firebase Auth verification for Edge Runtime
// This file now re-exports the jose-based implementation

// Re-export the jose-based implementation
export { verifyFirebaseToken, verifyFirebaseTokenSimple } from './firebase-auth-jose';

// Note: The previous simplified implementation has been moved to deprecated/firebase-auth-simple.ts
// The new implementation uses proper JWT signature verification with jose library
// See firebase-auth-jose.ts for the implementation details.