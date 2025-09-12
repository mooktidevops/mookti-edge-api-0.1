"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Polyfills for edge runtime compatibility
if (typeof globalThis === 'undefined') {
    global.globalThis = global;
}
if (typeof global === 'undefined') {
    globalThis.global = globalThis;
}
