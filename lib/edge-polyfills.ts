// Edge runtime polyfills for libraries that expect Node.js globals

// Polyfill for global object in Edge runtime
if (typeof globalThis.global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Export to ensure module is included
export {};