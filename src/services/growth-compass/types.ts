/**
 * Growth Compass Type Definitions
 * 
 * Core types for the holistic learning growth tracking system
 */

export interface GrowthCompass {
  userId: string;
  components: GrowthComponents;
  growthVelocity: GrowthVelocity;
  patterns: LearningPattern[];
  insights?: string[];
  lastUpdated: Date;
  createdAt: Date;
}

export interface GrowthComponents {
  goalAlignment: number;      // 0-1: How well learning aligns with stated goals
  balanceIndex: number;        // 0-1: Variety of learning approaches used
  depthScore: number;          // 0-1: Depth of understanding demonstrated
  recoveryEngagement: number;  // 0-1: Ability to recover from struggles
  reflectionQuality: number;   // 0-1: Quality of self-assessment
  connectionStrength: number;  // 0-1: Cross-domain connections made
}

export interface GrowthVelocity {
  current: number;      // Current growth rate (0-100)
  trend: number;        // Trend direction (-1 to +1)
  momentum: number;     // Sustained growth strength (0-100)
  projection: string;   // Natural language projection
}

export interface LearningPattern {
  type: string;
  strength: number;     // 0-1: How strongly pattern is expressed
  frequency: number;    // Times pattern observed
  lastSeen: Date;
  description: string;
}

export interface SeasonalWeight {
  season: LearningSeason;
  weight: number;       // 0-1: Emphasis on this season
  startDate: Date;
  endDate?: Date;
}

export type LearningSeason = 
  | 'exploration'     // Broad learning, trying new things
  | 'deepening'       // Going deep on specific topics
  | 'integration'     // Connecting and synthesizing
  | 'application'     // Practical implementation
  | 'reflection';     // Review and consolidation

export interface PowerPattern {
  name: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string[];
  optimalDuration?: number; // minutes
  effectiveness: number;    // 0-1
  conditions?: string[];    // Environmental factors
}

export interface GrowthSnapshot {
  timestamp: Date;
  compass: GrowthCompass;
  sessionCount: number;
  totalMinutes: number;
  topTools: string[];
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
  category: 'milestone' | 'pattern' | 'breakthrough' | 'consistency';
  icon?: string;
}

export interface GrowthTrend {
  period: 'daily' | 'weekly' | 'monthly';
  dataPoints: TrendPoint[];
  analysis: string;
  recommendations: string[];
}

export interface TrendPoint {
  date: Date;
  velocity: number;
  components: GrowthComponents;
  highlights?: string[];
}