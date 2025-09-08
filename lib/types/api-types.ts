// Type definitions for API request bodies

// Ellen Sessions API
export interface CreateSessionRequest {
  id?: string;  // Optional custom session ID
  userId: string;
  type?: 'study' | 'practice' | 'revision' | 'exploration';
  title?: string;
  context?: Record<string, any>;
  sessionGoal?: {
    type: string;
    description: string;
    targetDuration?: number;
  };
  resumeFromId?: string;
}

export interface UpdateSessionRequest {
  action?: 'pause' | 'resume' | 'complete';
  keyTakeaways?: string[];
  confidenceRating?: number;
  understandingRating?: number;
  difficultyRating?: number;
  messages?: any[];
  context?: Record<string, any>;
}

// Ellen Chat API
export interface EllenChatRequest {
  message: string;
  sessionId?: string;
  sessionType?: string;
  sessionGoal?: any;
  queryType?: string;
  toolOverride?: string;
  context?: {
    userId?: string;
    sessionId?: string;
    learningContext?: any;
  };
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Ellen Stream API
export interface EllenStreamRequest {
  message: string;
  sessionId?: string;
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: Record<string, any>;
  temperature?: number;
}

// Growth Compass API
export interface GrowthCompassDataRequest {
  userId: string;
  dateRange?: {
    start: string;
    end: string;
  };
  includeRawData?: boolean;
}

export interface GrowthCompassSessionRequest {
  userId: string;
  sessionData: {
    type: string;
    duration: number;
    processTypes: string[];
    toolsUsed?: string[];
    completed?: boolean;
  };
}