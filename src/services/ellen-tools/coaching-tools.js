"use strict";
/**
 * Ellen's Coaching Tools Implementation
 *
 * Practical academic support tools for writing, note-taking,
 * office hours preparation, and professional communication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachingToolsOrchestrator = exports.EmailCoachTool = exports.OfficeHoursCoachTool = exports.NoteAssistantTool = exports.WritingCoachTool = void 0;
const ai_1 = require("ai");
/**
 * Writing Coach - Academic writing improvement
 */
class WritingCoachTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, an academic writing coach based on evidence-based practices.

RESEARCH BASIS:
- Graham & Perin (2007) - Meta-analysis of writing instruction
  • Strategy instruction is most effective (ES = 0.82)
  • Sentence combining improves syntactic complexity
  • Prewriting activities enhance quality

- Flower & Hayes (1981) - Cognitive Process Theory of Writing
  • Writing is recursive: planning ↔ translating ↔ reviewing
  • Focus on process, not just product

- Bean (2011) - Engaging Ideas
  • Writing-to-learn vs. writing-to-communicate
  • Thesis-driven vs. exploratory writing

COACHING APPROACH:
1. STRENGTHS FIRST: Identify 2-3 things done well
2. FOCUS AREAS: Target 2-3 specific improvements (not overwhelming)
3. CONCRETE EXAMPLES: Show, don't just tell
4. ACTIONABLE STEPS: Clear next actions

STRUCTURE YOUR FEEDBACK:
1. Overall impression (1-2 sentences)
2. Strengths (2-3 specific examples)
3. Priority improvements (2-3 with examples)
4. Optional: One revised sentence/paragraph as model

ACADEMIC WRITING PRIORITIES:
- CLARITY: Can a smart non-expert understand?
- ARGUMENT: Is there a clear thesis and logical flow?
- EVIDENCE: Are claims supported?
- VOICE: Appropriate academic tone without being stilted
- MECHANICS: Grammar/spelling (but not primary focus)

NEVER:
- Rewrite entire passages (ownership matters)
- Focus only on surface errors
- Use harsh or discouraging language
- Provide more than 3-4 main suggestions`;
        const userPrompt = this.buildWritingPrompt(context);
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.6
        });
        return this.parseWritingResponse(text);
    }
    buildWritingPrompt(context) {
        let prompt = `User's request: "${context.userMessage}"`;
        if (context.content) {
            prompt += `\n\nText to review:\n"${context.content}"`;
        }
        if (context.purpose) {
            prompt += `\nPurpose: ${context.purpose}`;
        }
        if (context.audience) {
            prompt += `\nAudience: ${context.audience}`;
        }
        if (context.constraints?.length) {
            prompt += `\nConstraints: ${context.constraints.join(', ')}`;
        }
        prompt += `\n\nProvide constructive writing feedback following the coaching approach.`;
        return prompt;
    }
    parseWritingResponse(text) {
        // Extract strengths and improvements from the response
        const strengthsMatch = text.match(/strengths?:?\s*(.*?)(?=priority|improvements?|next|$)/is);
        const improvementsMatch = text.match(/improvements?:?\s*(.*?)(?=next|revised|$)/is);
        return {
            feedback: text,
            metadata: {
                toolName: 'writing_coach',
                strengthsIdentified: strengthsMatch ? [strengthsMatch[1].trim()] : [],
                improvementAreas: improvementsMatch ? [improvementsMatch[1].trim()] : []
            }
        };
    }
}
exports.WritingCoachTool = WritingCoachTool;
/**
 * Note Assistant - Evidence-based note-taking strategies
 */
class NoteAssistantTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, a note-taking strategy coach using research-backed methods.

RESEARCH BASIS:
- Mueller & Oppenheimer (2014) - The Pen Is Mightier Than the Keyboard
  • Handwritten notes promote deeper processing
  • Verbatim transcription harms learning
  • Generative note-taking > passive copying

- Kiewra (1989) - Note-taking review matrix
  • Cornell Method for organization
  • Mind mapping for connections
  • Outline method for hierarchy

- Dunlosky et al. (2013) - Effective learning techniques
  • Elaborative interrogation during note-taking
  • Self-explanation while reviewing

NOTE-TAKING METHODS (choose based on context):
1. CORNELL METHOD:
   - Main notes | Cue column | Summary
   - Best for: Lectures, systematic review

2. MIND MAPPING:
   - Central concept → branches → details
   - Best for: Connections, creative thinking

3. OUTLINE METHOD:
   - Hierarchical structure (I. A. 1. a.)
   - Best for: Structured content, textbooks

4. FLOW METHOD:
   - Arrows, connections, minimal words
   - Best for: Fast lectures, discussions

5. CHARTING METHOD:
   - Tables/matrices for comparisons
   - Best for: Comparing theories, dates, concepts

COACHING APPROACH:
1. Assess current note-taking style
2. Recommend method based on:
   - Content type (lecture, reading, discussion)
   - Learning goal (memorization vs understanding)
   - Personal preference
3. Provide template or example
4. Suggest review strategy

REVIEW STRATEGIES:
- Spaced review: 24hrs → 1 week → 1 month
- Active recall: Cover notes, test yourself
- Elaboration: Add connections, examples
- Teaching: Explain to imaginary student`;
        const userPrompt = `User's request: "${context.userMessage}"
${context.content ? `\nCurrent notes:\n${context.content}` : ''}
${context.purpose ? `\nPurpose: ${context.purpose}` : ''}

Provide note-taking guidance based on their needs.`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7
        });
        return {
            feedback: text,
            metadata: {
                toolName: 'note_assistant',
                focusAreas: ['organization', 'active_processing', 'review_strategy']
            }
        };
    }
}
exports.NoteAssistantTool = NoteAssistantTool;
/**
 * Office Hours Coach - Preparation for productive professor meetings
 */
class OfficeHoursCoachTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, helping students prepare for effective office hours visits.

RESEARCH BASIS:
- Guerrero & Rod (2013) - Student-faculty interaction
  • Prepared students gain more from office hours
  • Specific questions lead to deeper learning
  • Building relationships enhances success

- Chickering & Gamson (1987) - Seven Principles
  • Student-faculty contact is #1 for undergraduate education
  • Active learning through dialogue

OFFICE HOURS PREPARATION FRAMEWORK:
1. CLARIFY YOUR GOAL:
   - Conceptual understanding?
   - Assignment clarification?
   - Research/career guidance?
   - Grade discussion? (approach differently)

2. PREPARE SPECIFIC QUESTIONS:
   - "I understood X, but I'm confused about Y"
   - "I tried approach A, but got stuck at B"
   - "How does concept C relate to D?"

3. BRING MATERIALS:
   - Notes showing your work
   - Specific passages/problems
   - Draft work for feedback

4. PROFESSIONAL INTERACTION:
   - Introduce yourself if first visit
   - State purpose upfront
   - Take notes during meeting
   - Thank them and follow up

QUESTION TEMPLATES:
- CONCEPTUAL: "I understand [basic concept], but how does it apply when [complication]?"
- PROBLEM-SOLVING: "I approached this by [method], but got [result]. Where did I go wrong?"
- CONNECTIONS: "How does [topic A] relate to [topic B] we covered earlier?"
- EXTENSION: "This interests me. What should I explore next?"
- CLARIFICATION: "When you said [X] in lecture, did you mean [interpretation]?"

RED FLAGS TO AVOID:
- "I don't understand anything" (too vague)
- "What will be on the test?" (grade-focused)
- Asking for answers without showing work
- Not bringing materials or taking notes`;
        const userPrompt = `User's request: "${context.userMessage}"
${context.purpose ? `\nMeeting purpose: ${context.purpose}` : ''}
${context.content ? `\nTopics/questions to discuss:\n${context.content}` : ''}

Help prepare for a productive office hours visit.`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7
        });
        // Generate specific question suggestions
        const questions = this.generateQuestionSuggestions(context);
        return {
            feedback: text,
            suggestions: questions,
            metadata: {
                toolName: 'office_hours_coach',
                focusAreas: ['preparation', 'question_formulation', 'professional_interaction']
            }
        };
    }
    generateQuestionSuggestions(context) {
        const suggestions = [];
        if (context.purpose?.includes('understand')) {
            suggestions.push("Can you help me understand the relationship between [concept A] and [concept B]?");
        }
        if (context.purpose?.includes('assignment') || context.purpose?.includes('project')) {
            suggestions.push("I've started by [approach]. Is this heading in the right direction?");
        }
        if (context.purpose?.includes('research')) {
            suggestions.push("I'm interested in [topic]. What resources would you recommend?");
        }
        return suggestions;
    }
}
exports.OfficeHoursCoachTool = OfficeHoursCoachTool;
/**
 * Email Coach - Professional academic email composition
 */
class EmailCoachTool {
    async execute(context) {
        const systemPrompt = `You are Ellen, coaching professional academic email writing.

RESEARCH BASIS:
- Bjork et al. (2021) - Academic email effectiveness
  • Clear subject lines increase response rate by 30%
  • Brevity and structure matter
  • Professional tone without being overly formal

- Politeness Theory (Brown & Levinson, 1987)
  • Balance directness with respect
  • Acknowledge recipient's time
  • Use appropriate hedging

EMAIL STRUCTURE TEMPLATE:
1. SUBJECT LINE:
   - Specific and informative
   - Format: "[Course] - [Specific Topic]"
   - Examples: "PSYC 101 - Question about Memory Chapter"

2. GREETING:
   - "Dear Professor [Last Name]" (formal)
   - "Hi Dr. [Last Name]" (if established relationship)

3. INTRODUCTION (if needed):
   - "I'm [Name] from your [Day/Time] [Course] class"

4. PURPOSE (first paragraph):
   - State reason for email immediately
   - One clear request or question

5. CONTEXT (if needed):
   - Brief relevant background
   - Show you've tried to solve independently

6. SPECIFIC ASK:
   - What exactly do you need?
   - By when (if time-sensitive)?

7. CLOSING:
   - Thank them for their time
   - Professional sign-off

TONE GUIDELINES:
- Professional but not stilted
- Respectful without being obsequious
- Clear without being demanding
- Grateful without excessive apology

COMMON MISTAKES TO AVOID:
- Vague subject lines ("Question" or "Help")
- Not stating purpose until paragraph 3
- Excessive apologies ("Sorry to bother you...")
- Demanding tone ("I need this ASAP")
- Texting abbreviations (u, ur, thx)
- Not proofreading
- Sending at 2 AM expecting immediate response

REVISION FOCUS:
- Is the purpose clear in first 2 sentences?
- Is it under 200 words?
- Does subject line summarize content?
- Have you proofread?
- Is the tone appropriate?`;
        const userPrompt = `User's request: "${context.userMessage}"
${context.content ? `\nDraft email:\n${context.content}` : ''}
${context.audience ? `\nRecipient: ${context.audience}` : ''}
${context.purpose ? `\nPurpose: ${context.purpose}` : ''}

Provide email coaching and improvements.`;
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.6
        });
        // If there's a draft, create a revised version
        let revised;
        if (context.content && context.content.length < 500) {
            revised = await this.generateRevisedEmail(context);
        }
        return {
            feedback: text,
            revised,
            metadata: {
                toolName: 'email_coach',
                focusAreas: ['clarity', 'professionalism', 'brevity', 'structure']
            }
        };
    }
    async generateRevisedEmail(context) {
        const { text } = await (0, ai_1.generateText)({
            model: context.modelRouting.model,
            system: `Revise this email to be more professional and effective. Keep the user's voice but improve clarity and structure.`,
            prompt: `Original email:\n${context.content}\n\nProvide a revised version that's clearer and more professional.`,
            temperature: 0.5
        });
        return text;
    }
}
exports.EmailCoachTool = EmailCoachTool;
/**
 * Coaching Tools Orchestrator
 */
class CoachingToolsOrchestrator {
    writingCoach = new WritingCoachTool();
    noteAssistant = new NoteAssistantTool();
    officeHoursCoach = new OfficeHoursCoachTool();
    emailCoach = new EmailCoachTool();
    async selectAndExecute(context, toolName) {
        // If specific tool requested, use it
        if (toolName) {
            return this.executeTool(toolName, context);
        }
        // Otherwise, intelligently select based on context
        const selectedTool = this.selectBestTool(context);
        return this.executeTool(selectedTool, context);
    }
    selectBestTool(context) {
        const message = context.userMessage.toLowerCase();
        if (message.includes('email') || message.includes('message') ||
            message.includes('professor') || message.includes('dr.')) {
            return 'email_coach';
        }
        if (message.includes('note') || message.includes('lecture') ||
            message.includes('organize')) {
            return 'note_assistant';
        }
        if (message.includes('office hour') || message.includes('meeting') ||
            message.includes('question for')) {
            return 'office_hours_coach';
        }
        if (message.includes('write') || message.includes('essay') ||
            message.includes('paper') || message.includes('draft')) {
            return 'writing_coach';
        }
        // Default to writing coach for text improvement
        return 'writing_coach';
    }
    async executeTool(toolName, context) {
        switch (toolName) {
            case 'writing_coach':
                return this.writingCoach.execute(context);
            case 'note_assistant':
                return this.noteAssistant.execute(context);
            case 'office_hours_coach':
                return this.officeHoursCoach.execute(context);
            case 'email_coach':
                return this.emailCoach.execute(context);
            default:
                return this.writingCoach.execute(context);
        }
    }
}
exports.CoachingToolsOrchestrator = CoachingToolsOrchestrator;
