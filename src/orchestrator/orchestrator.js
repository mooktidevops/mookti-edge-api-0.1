"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const toolLoader_1 = require("./toolLoader");
const socraticController_1 = require("../controllers/socraticController");
const formativeController_1 = require("../controllers/formativeController");
class Orchestrator {
    toolLoader;
    socraticController;
    formativeController;
    currentStep = 0;
    loopPath = [];
    constructor() {
        this.toolLoader = new toolLoader_1.ToolLoader();
        this.socraticController = new socraticController_1.SocraticController();
        this.formativeController = new formativeController_1.FormativeController();
        this.loopPath = this.toolLoader.getDefaultLoop();
    }
    async processRequest(request) {
        // Validate entitlements
        if (!this.validateEntitlements(request)) {
            return {
                tool_name: request.tool_name,
                success: false,
                error: 'Insufficient entitlements for this operation'
            };
        }
        // Validate request against schema
        const validation = this.toolLoader.validateRequest(request.tool_name, request.payload);
        if (!validation.valid) {
            return {
                tool_name: request.tool_name,
                success: false,
                error: `Invalid request: ${JSON.stringify(validation.errors)}`
            };
        }
        // Check for blocked fields (no grades/scores)
        const blockedFields = this.toolLoader.checkForBlockedFields(request.payload);
        if (blockedFields.length > 0) {
            return {
                tool_name: request.tool_name,
                success: false,
                error: `Blocked fields detected: ${blockedFields.join(', ')}. This is a formative-only system.`
            };
        }
        // Route to appropriate controller
        const response = await this.routeToController(request);
        // Validate response against schema
        const responseValidation = this.toolLoader.validateResponse(request.tool_name, response.response);
        if (!responseValidation.valid) {
            console.error('Response validation failed:', responseValidation.errors);
        }
        return response;
    }
    async routeToController(request) {
        const tool = this.toolLoader.getTool(request.tool_name);
        if (!tool) {
            return {
                tool_name: request.tool_name,
                success: false,
                error: `Tool ${request.tool_name} not found`
            };
        }
        const modelTier = this.determineModelTier(request, tool);
        switch (request.tool_name) {
            case 'socratic_elenchus.v3.1':
                return await this.socraticController.process(request.payload, modelTier);
            case 'formative_check_and_feedback.v3':
            case 'diagnostic_probe_planner.v3':
            case 'revision_scheduler.v1':
            case 'worked_example_walker.v2':
            case 'concept_mapper.v2':
                return await this.formativeController.process(request.tool_name, request.payload, modelTier);
            default:
                return {
                    tool_name: request.tool_name,
                    success: false,
                    error: `No controller found for ${request.tool_name}`
                };
        }
    }
    determineModelTier(request, tool) {
        // Check if user has access to frontier models
        const entitlements = request.entitlements;
        if (entitlements?.plan.model_access.available_tiers.includes('F') &&
            entitlements.plan.features.frontier_models) {
            // Check escalation conditions
            if (tool.escalate_if && this.shouldEscalate(request.payload, tool.escalate_if.condition)) {
                return tool.escalate_if.to_tier;
            }
        }
        // Return default tier or user's max tier
        const userMaxTier = entitlements?.plan.model_access.default_tier || 'S';
        return tool.default_model_tier || userMaxTier;
    }
    shouldEscalate(payload, condition) {
        // Simple condition evaluation - can be expanded
        if (condition === 'complex_math' && payload.domain === 'mathematics') {
            return true;
        }
        if (condition === 'long_context' && payload.context?.prior_turns?.length > 5) {
            return true;
        }
        return false;
    }
    validateEntitlements(request) {
        if (!request.entitlements) {
            return true; // Allow if no entitlements system in place
        }
        const entitlements = request.entitlements;
        // Check rate limits
        if (entitlements.usage.requests_today >= entitlements.plan.rate_limits.tokens_per_day) {
            return false;
        }
        // Check tool access
        const tool = this.toolLoader.getTool(request.tool_name);
        if (tool && tool.name.includes('advanced') && !entitlements.plan.features.advanced_tools.includes(tool.name)) {
            return false;
        }
        return true;
    }
    getNextStep() {
        if (this.currentStep < this.loopPath.length) {
            const step = this.loopPath[this.currentStep];
            this.currentStep++;
            // Handle conditional paths (e.g., "tool1|tool2")
            if (step.includes('|')) {
                const options = step.split('|');
                return options[0]; // Default to first option
            }
            return step;
        }
        return undefined;
    }
    resetLoop() {
        this.currentStep = 0;
    }
}
exports.Orchestrator = Orchestrator;
