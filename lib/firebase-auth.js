"use strict";
// Firebase Auth verification for Edge Runtime
// This file now re-exports the Edge-compatible JWKS implementation
// Version: 2.0 - Using JWKS instead of X.509 certificates
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseTokenSimple = exports.verifyFirebaseToken = void 0;
// Re-export the Edge-compatible implementation that uses JWKS
var firebase_auth_edge_1 = require("./firebase-auth-edge");
Object.defineProperty(exports, "verifyFirebaseToken", { enumerable: true, get: function () { return firebase_auth_edge_1.verifyFirebaseToken; } });
Object.defineProperty(exports, "verifyFirebaseTokenSimple", { enumerable: true, get: function () { return firebase_auth_edge_1.verifyFirebaseTokenSimple; } });
// Note: The X.509 certificate-based implementation (firebase-auth-jose.ts) 
// has compatibility issues with Vercel Edge Runtime.
// The new implementation uses Google's JWKS endpoint which works better
// in Edge Runtime environments.
