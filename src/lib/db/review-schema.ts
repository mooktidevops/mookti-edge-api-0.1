import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  integer,
  boolean,
  decimal,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './schema';

// Conversation Reviews Table
export const conversationReviews = pgTable('conversation_reviews', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  sessionId: uuid('session_id').notNull(), // References Ellen sessions
  reviewedAt: timestamp('reviewed_at').defaultNow(),
  reviewType: varchar('review_type', { length: 20 }).notNull(), // 'human', 'automated', 'hybrid'
  reviewTier: varchar('review_tier', { length: 20 }), // 'full', 'standard', 'light', 'skip'
  reviewerId: uuid('reviewer_id').references(() => user.id), // For human reviews
  
  // Quality Scores (0-100)
  pedagogicalEffectiveness: integer('pedagogical_effectiveness'),
  studentEngagement: integer('student_engagement'),
  conceptualClarity: integer('conceptual_clarity'),
  appropriateChallenge: integer('appropriate_challenge'),
  emotionalSupport: integer('emotional_support'),
  
  // Binary Flags
  learningObjectiveMet: boolean('learning_objective_met'),
  frustrationHandledWell: boolean('frustration_handled_well'),
  toolSelectionOptimal: boolean('tool_selection_optimal'),
  needsEscalation: boolean('needs_escalation').default(false),
  
  // Detailed Analysis
  insights: json('insights').$type<{
    learningStyle?: 'visual' | 'verbal' | 'kinesthetic' | 'mixed';
    comprehensionLevel?: 'struggling' | 'developing' | 'proficient';
    engagementPattern?: 'increasing' | 'stable' | 'declining';
    primaryChallenges?: string[];
    successfulStrategies?: string[];
    missedOpportunities?: string[];
  }>(),
  issues: json('issues').$type<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp?: string;
  }>>(),
  patterns: json('patterns').$type<Array<{
    type: string;
    frequency: number;
    description: string;
  }>>(),
  recommendations: text('recommendations').array(),
  
  // Metadata
  modelUsed: varchar('model_used', { length: 50 }), // Which LLM reviewed
  processingTimeMs: integer('processing_time_ms'),
  tokenCount: integer('token_count'),
  reviewCost: decimal('review_cost', { precision: 10, scale: 6 }),
  
  // Human Review
  humanAgreement: boolean('human_agreement'), // Did human agree with LLM?
  humanNotes: text('human_notes'),
  tags: text('tags').array(),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    sessionIdx: index('idx_reviews_session').on(table.sessionId),
    createdIdx: index('idx_reviews_created').on(table.createdAt),
    escalationIdx: index('idx_reviews_needs_escalation').on(table.needsEscalation),
  };
});

export type ConversationReview = InferSelectModel<typeof conversationReviews>;

// Review Queue Table
export const reviewQueue = pgTable('review_queue', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  priority: integer('priority').notNull().default(50), // 0-100, higher = urgent
  reason: varchar('reason', { length: 100 }), // Why it needs review
  status: varchar('status', { length: 20 }).default('pending'), // pending, in_progress, completed, skipped
  assignedTo: uuid('assigned_to').references(() => user.id),
  assignedAt: timestamp('assigned_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  
  // Additional context
  triggerType: varchar('trigger_type', { length: 50 }), // 'frustration', 'abandonment', 'tool_thrashing', etc.
  metadata: json('metadata').$type<{
    frustrationScore?: number;
    messageCount?: number;
    toolSwitches?: number;
    duration?: number;
    userRating?: number;
  }>(),
}, (table) => {
  return {
    statusPriorityIdx: index('idx_queue_status_priority').on(table.status, table.priority),
    sessionIdx: index('idx_queue_session').on(table.sessionId),
  };
});

export type ReviewQueueItem = InferSelectModel<typeof reviewQueue>;

// Review Patterns Table (for tracking systemic issues)
export const reviewPatterns = pgTable('review_patterns', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  patternType: varchar('pattern_type', { length: 50 }), // 'tool_failure', 'confusion_point', etc.
  description: text('description'),
  frequency: integer('frequency').default(1),
  firstSeen: timestamp('first_seen'),
  lastSeen: timestamp('last_seen'),
  sessions: uuid('sessions').array(), // Array of affected session IDs
  status: varchar('status', { length: 20 }).default('active'), // active, resolved, monitoring
  resolution: text('resolution'),
  
  // Pattern details
  affectedTools: text('affected_tools').array(),
  commonPhrases: text('common_phrases').array(),
  averageSeverity: decimal('average_severity', { precision: 3, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    typeStatusIdx: index('idx_patterns_type_status').on(table.patternType, table.status),
  };
});

export type ReviewPattern = InferSelectModel<typeof reviewPatterns>;

// Daily Review Metrics (materialized view equivalent)
export const dailyReviewMetrics = pgTable('daily_review_metrics', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  date: timestamp('date').notNull(),
  
  // Volume metrics
  totalSessions: integer('total_sessions').notNull().default(0),
  reviewedSessions: integer('reviewed_sessions').notNull().default(0),
  humanReviews: integer('human_reviews').notNull().default(0),
  automatedReviews: integer('automated_reviews').notNull().default(0),
  
  // Quality metrics
  avgPedagogicalScore: decimal('avg_pedagogical_score', { precision: 5, scale: 2 }),
  avgEngagementScore: decimal('avg_engagement_score', { precision: 5, scale: 2 }),
  avgEmotionalSupport: decimal('avg_emotional_support', { precision: 5, scale: 2 }),
  
  // Issue metrics
  escalatedCount: integer('escalated_count').notNull().default(0),
  frustrationEvents: integer('frustration_events').notNull().default(0),
  abandonedSessions: integer('abandoned_sessions').notNull().default(0),
  toolFailures: integer('tool_failures').notNull().default(0),
  
  // Cost metrics
  totalReviewCost: decimal('total_review_cost', { precision: 10, scale: 2 }),
  avgReviewTime: integer('avg_review_time_ms'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    dateIdx: index('idx_metrics_date').on(table.date),
  };
});

export type DailyReviewMetric = InferSelectModel<typeof dailyReviewMetrics>;