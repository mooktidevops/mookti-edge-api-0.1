"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
const environment_1 = require("../lib/config/environment");
exports.config = {
    runtime: 'edge',
};
async function handler(request) {
    const envConfig = (0, environment_1.getEnvironmentConfig)();
    return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: envConfig.name,
        devMode: envConfig.enableDevMode,
        version: '1.0.0',
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
