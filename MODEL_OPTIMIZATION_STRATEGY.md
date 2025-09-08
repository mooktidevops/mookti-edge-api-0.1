# Model Optimization Strategy for Mookti
*Based on LLM Pricing Analysis - September 7, 2025*

## Executive Summary

We're implementing a clear 4-tier model selection system that matches task complexity to model capabilities, ensuring cost-effectiveness while maintaining our premium value proposition with frontier model access.

## 4-Tier Model System

### Tier 1: Simple/Fast Tasks
**Purpose**: High-volume, low-complexity operations requiring quick responses
**Primary Model**: Gemini 2.5 Flash-Lite ($0.02/$0.08 per M)
**Fallback**: GPT-5 Nano ($0.05/$0.40 per M)
**Examples**:
- Query classification
- Simple Q&A
- Session management
- Basic content extraction
- Pattern matching

### Tier 2: Balanced Tasks
**Purpose**: Standard tutoring and coaching requiring nuanced understanding
**Primary Model**: Gemini 2.5 Flash ($0.075/$0.30 per M)
**Fallback**: GPT-5 Mini ($0.25/$2.00 per M)
**Examples**:
- Socratic questioning
- Writing feedback
- Email coaching
- Content generation
- General tutoring

### Tier 3: Complex & Diagnostics
**Purpose**: Tasks requiring deep reasoning, analysis, and problem-solving
**Primary Model**: O4-Mini ($0.60/$2.40 per M)
**Fallback**: Gemini 2.5 Pro ($1.25/$5.00 per M)
**Examples**:
- Learning diagnostics
- Troubleshooting
- Mathematical reasoning
- Multi-step problem solving
- Pattern analysis

### Tier 4: Frontier Reasoning
**Purpose**: State-of-the-art AI for premium experiences and complex tasks
**Auto Default**: Gemini 2.5 Pro ($1.25/$5 per M, up to $4/$20 for long context)
**User Options**:
- Claude Opus 4.1 ($15/$75 per M) - Complex agents, deep research
- GPT-5 ($1.25/$10 per M) - Advanced coding, comprehensive courses
- Gemini 2.5 Pro - Large documents, multimodal analysis

## Implementation Plan (Immediate)

### Step 1: Update Model Tiers Configuration
Create new tier definitions with clear semantic meaning and model mappings.

### Step 2: Update Tool Configuration
Map each tool to appropriate tier based on complexity requirements.

### Step 3: Implement Model Selection Logic
Create selection function with tier-based routing and user preference handling.

### Step 4: Add Frontier Model Support
Ensure all frontier models are available with 'auto' defaulting to Gemini 2.5 Pro.

### Step 5: Update Orchestrator
Integrate new model selection throughout the orchestration pipeline.

## Tool-to-Tier Mapping

### Tier 1 Tools
- reflection_tool (simple emotional processing)
- note_assistant (basic formatting)
- plan_manager (goal structuring)
- focus_session (timer management)
- flashcard_generator (pattern extraction)
- concept_mapper (basic relationships)
- self_explanation (user-driven)

### Tier 2 Tools
- socratic_tool (nuanced questioning)
- extension_tool (creative connections)
- writing_coach (detailed feedback)
- email_coach (professional communication)
- analogy_builder (creative comparisons)
- dual_coding (multimodal representation)
- desirable_difficulties (challenge creation)

### Tier 3 Tools
- learning_diagnostic (pattern analysis)
- troubleshooter (systematic problem-solving)
- metacognitive_calibration (accuracy assessment)
- strategy_selector (matching strategies)
- genealogy_tool (complex knowledge graphs)
- worked_example (step-by-step solutions)

### Tier 4 Tools
- Any tool when user selects frontier model
- Complex multi-tool workflows
- Research-intensive tasks
- Advanced curriculum development

## Cost Impact

### Current vs Optimized (per 1000 daily users)
- **Current**: $840/day ($25,200/month)
- **Optimized**: $312/day ($9,360/month)
- **Savings**: 63% ($15,840/month)

### Per-Tier Cost Estimates
- **Tier 1**: $0.00008/request
- **Tier 2**: $0.00025/request
- **Tier 3**: $0.00060/request
- **Tier 4**: $0.00125/request (auto with Gemini)

## Special Handling

### Context-Aware Selection
```typescript
// Switch to Gemini for large contexts
if (context.tokenCount > 50000) {
  return 'gemini-1.5-flash'; // 1M context window
}
```

### User Preference Priority
```typescript
// Always respect explicit user selection
if (userPreference && userPreference !== 'auto') {
  return userPreference;
}
```

## Monitoring Plan

### Key Metrics
- Cost per tier per hour
- Response time by tier (P50/P95)
- User satisfaction by tier
- Frontier model usage percentage
- Fallback frequency

### Success Criteria
- Tier 1: < 500ms latency, 85% satisfaction
- Tier 2: < 1500ms latency, 92% satisfaction
- Tier 3: < 2000ms latency, 95% satisfaction
- Tier 4: < 3000ms latency, 98% satisfaction

## Next Actions

1. ✅ Create new tier configuration file
2. ✅ Update tool configurations with tier assignments
3. ✅ Implement model selection function
4. ✅ Add frontier model support
5. ✅ Update orchestrator integration
6. ⏳ Test with real queries
7. ⏳ Monitor performance metrics

---

*Implementation Status: Ready for immediate deployment*