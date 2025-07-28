// Firebase Authentication verification for Edge Functions

import * as admin from 'firebase-admin';
import type { ErrorResponse } from './types';

let app: admin.app.App | null = null;

// Initialize Firebase Admin SDK
function initializeFirebase() {
  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase configuration missing');
    }

    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  return app;
}

export async function verifyFirebaseToken(authHeader: string | null): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  error?: ErrorResponse;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: {
        error: 'Missing or invalid authorization header',
        code: 'AUTH_HEADER_MISSING',
      },
    };
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const firebaseApp = initializeFirebase();
    const decodedToken = await admin.auth(firebaseApp).verifyIdToken(token);
    
    return {
      success: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error: any) {
    console.error('Token verification failed:', error);
    
    let errorCode = 'AUTH_INVALID_TOKEN';
    let errorMessage = 'Invalid authentication token';
    
    if (error.code === 'auth/id-token-expired') {
      errorCode = 'AUTH_TOKEN_EXPIRED';
      errorMessage = 'Authentication token has expired';
    } else if (error.code === 'auth/argument-error') {
      errorCode = 'AUTH_MALFORMED_TOKEN';
      errorMessage = 'Malformed authentication token';
    }
    
    return {
      success: false,
      error: {
        error: errorMessage,
        code: errorCode,
        details: error.message,
      },
    };
  }
}

// Simple rate limiting using Vercel KV (Redis)
export async function checkRateLimit(userId: string, limit: number = 100): Promise<boolean> {
  // For MVP, we'll implement a simple in-memory rate limit
  // In production, use Vercel KV or similar
  return true; // Allow all requests for now
}