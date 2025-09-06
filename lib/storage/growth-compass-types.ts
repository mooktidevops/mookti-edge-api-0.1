// Growth Compass Type Definitions for Storage

export type Season = 'sprint' | 'steady' | 'recovery' | 'transition';

export type SyncLevel = 'resync' | 'improving' | 'synced';

export interface GrowthVelocityComponents {
  goalAlignment: number;      // 0-100
  balanceIndex: number;       // 0-100
  depthScore: number;         // 0-100
  recoveryEngagement: number; // 0-100
  reflectionQuality: number;  // 0-100
}

export interface GrowthVelocity {
  score: number;              // 0-100
  trend: 'rising' | 'steady' | 'declining';
  components: GrowthVelocityComponents;
  lastUpdated: Date;
}

export interface BalanceDistribution {
  plan: number;    // percentage
  learn: number;   // percentage
  perform: number; // percentage
}

export interface OptimalWindow {
  dayOfWeek: number;  // 0-6 (Sunday-Saturday)
  startHour: number;  // 0-23
  endHour: number;    // 0-23
  strength: number;   // 0-100
  isPrimeLocked?: boolean;
}

export interface RhythmData {
  optimalWindows: OptimalWindow[];
  actualSessions: SessionData[];
  heatmapData: HeatmapCell[][];
  nextOptimalSession?: Date;
}

export interface HeatmapCell {
  hour: number;
  day: number;
  performance: number; // 0-100
  sessionCount: number;
}

export interface SessionData {
  id: string;
  startTime: Date;
  endTime: Date;
  focusDuration: number; // minutes
  quality: number;       // 0-100
  type: 'plan' | 'learn' | 'perform';
  courseId?: string;
  taskCompleted?: boolean;
  understandingRating?: number; // 1-5
  mood?: string;
  energy?: number; // 1-10
}

export interface SyncScore {
  value: number;        // 0-100
  level: SyncLevel;
  suggestions?: ResyncSuggestion[];
}

export interface ResyncSuggestion {
  type: 'move_task' | 'add_retrieval' | 'schedule_recovery';
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PowerPattern {
  id: string;
  name: string;
  description: string;
  confidence: number;    // 0-100
  validations: number;   // count
  isAdopted: boolean;
  applicableCourses?: string[];
  discoveredDate: Date;
  lastValidated?: Date;
}

export interface RecoveryActivity {
  id: string;
  type: 'mindfulness' | 'movement' | 'sleep' | 'creativity' | 'gratitude' | 'social';
  duration: number;      // minutes
  timestamp: Date;
  quality?: number;      // 0-100
  notes?: string;
}

// Data collection tracking
export interface DataCollectionStats {
  firstSessionDate: Date | null;
  totalSessions: number;
  totalDaysActive: number;
  weeksActive: number;
  lastSessionDate: Date | null;
}

export interface GrowthCompassData {
  userId: string;
  currentSeason: Season;
  seasonStartDate: Date;
  seasonEndDate?: Date;
  growthVelocity: GrowthVelocity;
  balanceDistribution: BalanceDistribution;
  targetBalance: BalanceDistribution;
  rhythmData: RhythmData;
  syncScore: SyncScore;
  powerPatterns: PowerPattern[];
  recoveryActivities: RecoveryActivity[];
  dataCollection?: DataCollectionStats;
  lastUpdated?: number;
}

// Settings related types
export interface NotificationSettings {
  quietHours: {
    enabled: boolean;
    start: string;    // "HH:MM"
    end: string;      // "HH:MM"
    days: number[];   // 0-6
  };
  channels: {
    push: boolean;
    email: boolean;
  };
  frequencyPerType: {
    rhythmReminders: 'high' | 'medium' | 'low' | 'off';
    recoveryCelebrations: 'high' | 'medium' | 'low' | 'off';
    patternInsights: 'high' | 'medium' | 'low' | 'off';
    seasonTransitions: 'high' | 'medium' | 'low' | 'off';
  };
  lowPressureMode: boolean;
}

export interface SessionSettings {
  promptFrequency: 20 | 40 | 60; // minutes
  lowFrictionMode: boolean;
  defaultDuration: number;       // minutes
}

export interface PrivacySettings {
  dataOptIn: {
    sessionTiming: boolean;
    performance: boolean;
    mood: boolean;
    stressSensing: boolean;
    reflectionText: boolean;
  };
  onDeviceProcessing: boolean;
  dataRetentionDays: number;
}