// Firebase Auth verification for Edge Runtime
// This file now re-exports the Edge-compatible JWKS implementation
// Version: 2.0 - Using JWKS instead of X.509 certificates

// Re-export the Edge-compatible implementation that uses JWKS
export { verifyFirebaseToken, verifyFirebaseTokenSimple } from './firebase-auth-edge';

// Note: The X.509 certificate-based implementation (firebase-auth-jose.ts) 
// has compatibility issues with Vercel Edge Runtime.
// The new implementation uses Google's JWKS endpoint which works better
// in Edge Runtime environments.