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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default({ strict: false, allErrors: true });
class ToolLoader {
    registry;
    validators = new Map();
    tools = new Map();
    constructor(registryPath) {
        const defaultPath = path.join(__dirname, '../../coaching-expansion/step_1/orchestrator/tool_registry.json');
        const registryFile = registryPath || defaultPath;
        this.registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
        this.loadTools();
    }
    loadTools() {
        for (const tool of this.registry.tools) {
            this.tools.set(tool.name, tool);
            // Load and compile request schema
            if (tool.request_schema) {
                const schemaPath = path.join(__dirname, '../../coaching-expansion/step_1', tool.request_schema);
                if (fs.existsSync(schemaPath)) {
                    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                    const validator = ajv.compile(schema);
                    this.validators.set(`${tool.name}_request`, validator);
                }
            }
            // Load and compile response schema
            if (tool.response_schema) {
                const schemaPath = path.join(__dirname, '../../coaching-expansion/step_1', tool.response_schema);
                if (fs.existsSync(schemaPath)) {
                    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
                    const validator = ajv.compile(schema);
                    this.validators.set(`${tool.name}_response`, validator);
                }
            }
        }
    }
    validateRequest(toolName, payload) {
        const validator = this.validators.get(`${toolName}_request`);
        if (!validator) {
            return { valid: false, errors: [{ message: `No validator found for ${toolName}` }] };
        }
        const valid = validator(payload);
        return { valid, errors: validator.errors };
    }
    validateResponse(toolName, response) {
        const validator = this.validators.get(`${toolName}_response`);
        if (!validator) {
            return { valid: false, errors: [{ message: `No validator found for ${toolName}` }] };
        }
        const valid = validator(response);
        return { valid, errors: validator.errors };
    }
    getTool(name) {
        return this.tools.get(name);
    }
    getRegistry() {
        return this.registry;
    }
    getDefaultLoop() {
        return this.registry.routing_default_loop;
    }
    isFormativeOnly() {
        return this.registry.formative_only;
    }
    getBlockedFields() {
        return this.registry.blocked_fields;
    }
    checkForBlockedFields(data) {
        const blocked = [];
        const blockedFields = this.getBlockedFields();
        const checkObject = (obj, path = '') => {
            for (const key in obj) {
                const fullPath = path ? `${path}.${key}` : key;
                if (blockedFields.includes(key.toLowerCase())) {
                    blocked.push(fullPath);
                }
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    checkObject(obj[key], fullPath);
                }
            }
        };
        checkObject(data);
        return blocked;
    }
}
exports.ToolLoader = ToolLoader;
