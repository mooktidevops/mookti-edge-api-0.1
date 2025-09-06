// Polyfills for edge runtime compatibility
if (typeof globalThis === 'undefined') {
  (global as any).globalThis = global;
}

if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

export {};