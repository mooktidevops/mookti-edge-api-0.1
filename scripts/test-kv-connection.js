#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env' });
async function testKVConnection() {
    console.log('Testing Vercel KV connection...\n');
    try {
        // Import dynamically to ensure env vars are loaded
        const { kv } = await Promise.resolve().then(() => __importStar(require('@vercel/kv')));
        // Test 1: Set a value
        console.log('1️⃣ Setting test value...');
        await kv.set('test:connection', 'working', { ex: 60 });
        console.log('✅ Set successful');
        // Test 2: Get the value
        console.log('\n2️⃣ Getting test value...');
        const value = await kv.get('test:connection');
        console.log(`✅ Got value: ${value}`);
        // Test 3: Delete the value
        console.log('\n3️⃣ Deleting test value...');
        await kv.del('test:connection');
        console.log('✅ Deleted successfully');
        console.log('\n🎉 KV connection is working!');
    }
    catch (error) {
        console.error('❌ KV connection failed:', error);
        process.exit(1);
    }
}
testKVConnection().catch(console.error);
