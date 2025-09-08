// Ellen Session Type Definitions

export type SessionType = 'study' | 'coaching' | 'planning' | 'reflection' | 'writing';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type ProcessType = 'focus' | 'retrieval' | 'revision' | 'creation' | 'exploration';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    toolsUsed?: string[];
    citations?: Array<{ source: string; relevance: number }>;
    processType?: ProcessType;
    retrievalNamespaces?: string[];
  };
}

export interface SessionContext {
  learningGoal?: string;
  currentTask?: string;
  activeTools?: string[];
  priorKnowledge?: string[];
  courseName?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ProcessMetrics {
  focusDuration?: number;  // minutes
  retrievalAttempts?: number;
  revisionsCompleted?: number;
  conceptsExplored?: number;
  questionsAsked?: number;
  reflectionsWritten?: number;
  strategiesUsed?: string[];
}

export interface SessionGoal {
  type: ProcessType;
  description?: string;
  targetDuration?: number;  // minutes
  specificStrategy?: string;
}

export interface EllenSession {
  id: string;
  userId: string;
  type: SessionType;
  status: SessionStatus;
  title: string;
  
  // Timing
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  totalDuration: number;  // minutes
  
  // Content
  messages: SessionMessage[];
  context: SessionContext;
  
  // Process Tracking (for Growth Compass)
  sessionGoal?: SessionGoal;
  processMetrics: ProcessMetrics;
  
  // Learning Outcomes
  keyTakeaways?: string[];
  confidenceRating?: number;  // 1-5
  understandingRating?: number;  // 1-5
  difficultyRating?: number;  // 1-5
  
  // Growth Compass Integration
  growthContributions?: {
    goalAlignment?: number;
    processEngagement?: number;
    depthScore?: number;
    reflectionQuality?: number;
  };
  
  // Milestones Earned
  milestonesEarned?: string[];
  
  // Next Steps
  nextSessionSuggestion?: {
    type: SessionType;
    topic?: string;
    strategy?: string;
    estimatedDuration?: number;
  };
}

export interface SessionSummary {
  id: string;
  userId: string;
  type: SessionType;
  status: SessionStatus;
  title: string;
  startedAt: Date;
  lastActiveAt: Date;
  duration: number;
  messageCount: number;
  processMetrics?: {
    primaryProcess?: ProcessType;
    completionRate?: number;
  };
}

export interface SessionFilters {
  userId?: string;
  type?: SessionType;
  status?: SessionStatus;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number;
  processType?: ProcessType;
}

export interface SessionCreateRequest {
  id?: string;  // Optional custom session ID
  userId: string;
  type: SessionType;
  title?: string;
  context?: SessionContext;
  sessionGoal?: SessionGoal;
  resumeFromId?: string;  // If resuming a previous session
}

export interface SessionUpdateRequest {
  status?: SessionStatus;
  context?: Partial<SessionContext>;
  processMetrics?: Partial<ProcessMetrics>;
  keyTakeaways?: string[];
  confidenceRating?: number;
  understandingRating?: number;
  difficultyRating?: number;
  growthContributions?: Record<string, number>;
}

export interface SessionMessageAddRequest {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: SessionMessage['metadata'];
}