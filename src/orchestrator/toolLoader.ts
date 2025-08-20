import { ToolDefinition, ToolRegistry, ToolRequest, ToolResponse } from '../types/ellen';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';

const ajv = new Ajv({ strict: false, allErrors: true });

export class ToolLoader {
  private registry: ToolRegistry;
  private validators: Map<string, any> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(registryPath?: string) {
    const defaultPath = path.join(__dirname, '../../coaching-expansion/step_1/orchestrator/tool_registry.json');
    const registryFile = registryPath || defaultPath;
    
    this.registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
    this.loadTools();
  }

  private loadTools(): void {
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

  public validateRequest(toolName: string, payload: any): { valid: boolean; errors?: any[] } {
    const validator = this.validators.get(`${toolName}_request`);
    if (!validator) {
      return { valid: false, errors: [{ message: `No validator found for ${toolName}` }] };
    }
    
    const valid = validator(payload);
    return { valid, errors: validator.errors };
  }

  public validateResponse(toolName: string, response: any): { valid: boolean; errors?: any[] } {
    const validator = this.validators.get(`${toolName}_response`);
    if (!validator) {
      return { valid: false, errors: [{ message: `No validator found for ${toolName}` }] };
    }
    
    const valid = validator(response);
    return { valid, errors: validator.errors };
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getRegistry(): ToolRegistry {
    return this.registry;
  }

  public getDefaultLoop(): string[] {
    return this.registry.routing_default_loop;
  }

  public isFormativeOnly(): boolean {
    return this.registry.formative_only;
  }

  public getBlockedFields(): string[] {
    return this.registry.blocked_fields;
  }

  public checkForBlockedFields(data: any): string[] {
    const blocked: string[] = [];
    const blockedFields = this.getBlockedFields();
    
    const checkObject = (obj: any, path = ''): void => {
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