import { generateText } from 'ai';
import { modelSelection } from '../model-selection';

export interface ProblemSolverParams {
  message: string;
  problemType?: 'math' | 'physics' | 'chemistry' | 'programming' | 'logic' | 'general';
  retrievalContent?: string;
  context?: any;
  showWork?: boolean;
}

export interface ProblemSolverResult {
  content: string;
  solution?: string;
  steps?: Array<{
    step: number;
    description: string;
    work?: string;
  }>;
  checkYourWork?: string[];
  commonMistakes?: string[];
}

/**
 * Problem Solver Tool
 * 
 * Purpose: Help students work through problems step-by-step
 * Use cases:
 * - "Help me solve this integral"
 * - "Debug this code"
 * - "Work through this physics problem"
 * - "Solve this chemical equation"
 * 
 * Key approach: Systematic decomposition and step-by-step solution
 */
export class ProblemSolverTool {
  name = 'problem_solver';
  description = 'Helps work through problems step-by-step with clear methodology';
  
  async execute(params: ProblemSolverParams): Promise<ProblemSolverResult> {
    const { message, problemType, retrievalContent, showWork = true } = params;
    
    // Use reasoning model for problem solving
    const { model } = modelSelection.selectModel({ 
      requiresReasoning: true,
      complexity: 3 // High complexity for problem solving
    });
    
    const systemPrompt = `You are a problem-solving assistant helping students work through academic problems.

APPROACH:
1. Identify what type of problem this is
2. Break it down into clear steps
3. Show your work for each step (if applicable)
4. Arrive at the solution
5. Suggest how to check the answer

INSTRUCTIONS:
- Be systematic and methodical
- Show ALL work and reasoning
- Explain each step clearly
- Point out common mistakes to avoid
- If it's a multi-part problem, handle each part
- For programming: include code snippets
- For math/science: show equations and calculations
- For logic: show reasoning chains

FORMAT:
Step 1: [What we're doing]
[Show the work]
[Explain why]

Step 2: [Next action]
[Work/calculation]
[Reasoning]

...

Final Answer: [Clear statement of solution]

${problemType ? `\nPROBLEM TYPE: ${problemType}` : ''}
${retrievalContent ? `\nRELEVANT FORMULAS/CONCEPTS:\n${retrievalContent}` : ''}

IMPORTANT: Don't just give the answer - show HOW to get there.`;

    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: `Problem to solve: "${message}"\n\n${showWork ? 'Show all work and reasoning.' : 'Provide a concise solution.'}`,
        temperature: 0.3, // Lower temperature for accuracy in problem solving
        maxRetries: 2
      });
      
      // Parse the response to extract structured information
      const parsed = this.parseResponse(text);
      
      return {
        content: text,
        solution: parsed.solution,
        steps: parsed.steps,
        checkYourWork: parsed.checkYourWork,
        commonMistakes: parsed.commonMistakes
      };
    } catch (error) {
      console.error('[ProblemSolver] Generation failed:', error);
      
      return {
        content: "Let me help you solve this problem. Could you provide the complete problem statement, including any given values or constraints?",
        steps: []
      };
    }
  }
  
  private parseResponse(text: string): {
    solution?: string;
    steps: Array<{ step: number; description: string; work?: string }>;
    checkYourWork: string[];
    commonMistakes: string[];
  } {
    const lines = text.split('\n');
    const steps: Array<{ step: number; description: string; work?: string }> = [];
    const checkYourWork: string[] = [];
    const commonMistakes: string[] = [];
    let solution: string | undefined;
    
    let currentStep: { step: number; description: string; work?: string } | null = null;
    let inCheckSection = false;
    let inMistakesSection = false;
    
    for (const line of lines) {
      // Look for step markers
      const stepMatch = line.match(/^Step\s+(\d+):?\s*(.+)/i);
      if (stepMatch) {
        if (currentStep) {
          steps.push(currentStep);
        }
        currentStep = {
          step: parseInt(stepMatch[1]),
          description: stepMatch[2],
          work: ''
        };
        continue;
      }
      
      // Look for final answer
      if (/^Final Answer:|^Solution:|^Answer:/i.test(line)) {
        solution = line.replace(/^(Final Answer|Solution|Answer):?\s*/i, '');
        if (currentStep) {
          steps.push(currentStep);
          currentStep = null;
        }
        continue;
      }
      
      // Look for check your work section
      if (/Check Your Work:|Verification:/i.test(line)) {
        inCheckSection = true;
        inMistakesSection = false;
        continue;
      }
      
      // Look for common mistakes section
      if (/Common Mistakes:|Watch Out For:/i.test(line)) {
        inMistakesSection = true;
        inCheckSection = false;
        continue;
      }
      
      // Add to appropriate section
      if (inCheckSection && line.trim()) {
        checkYourWork.push(line.trim());
      } else if (inMistakesSection && line.trim()) {
        commonMistakes.push(line.trim());
      } else if (currentStep && line.trim()) {
        currentStep.work = (currentStep.work || '') + '\n' + line;
      }
    }
    
    // Don't forget the last step
    if (currentStep) {
      steps.push(currentStep);
    }
    
    return {
      solution,
      steps,
      checkYourWork,
      commonMistakes
    };
  }
}

export const problemSolverTool = new ProblemSolverTool();