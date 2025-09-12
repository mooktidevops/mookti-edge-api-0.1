"use strict";
// Edge runtime polyfills for libraries that expect Node.js globals
Object.defineProperty(exports, "__esModule", { value: true });
// Polyfill for global object in Edge runtime
if (typeof globalThis.global === 'undefined') {
    globalThis.global = globalThis;
}
