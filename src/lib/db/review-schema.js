"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyReviewMetrics = exports.reviewPatterns = exports.reviewQueue = exports.conversationReviews = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("./schema");
// Conversation Reviews Table
exports.conversationReviews = (0, pg_core_1.pgTable)('conversation_reviews', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull(), // References Ellen sessions
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at').defaultNow(),
    reviewType: (0, pg_core_1.varchar)('review_type', { length: 20 }).notNull(), // 'human', 'automated', 'hybrid'
    reviewTier: (0, pg_core_1.varchar)('review_tier', { length: 20 }), // 'full', 'standard', 'light', 'skip'
    reviewerId: (0, pg_core_1.uuid)('reviewer_id').references(() => schema_1.user.id), // For human reviews
    // Quality Scores (0-100)
    pedagogicalEffectiveness: (0, pg_core_1.integer)('pedagogical_effectiveness'),
    studentEngagement: (0, pg_core_1.integer)('student_engagement'),
    conceptualClarity: (0, pg_core_1.integer)('conceptual_clarity'),
    appropriateChallenge: (0, pg_core_1.integer)('appropriate_challenge'),
    emotionalSupport: (0, pg_core_1.integer)('emotional_support'),
    // Binary Flags
    learningObjectiveMet: (0, pg_core_1.boolean)('learning_objective_met'),
    frustrationHandledWell: (0, pg_core_1.boolean)('frustration_handled_well'),
    toolSelectionOptimal: (0, pg_core_1.boolean)('tool_selection_optimal'),
    needsEscalation: (0, pg_core_1.boolean)('needs_escalation').default(false),
    // Detailed Analysis
    insights: (0, pg_core_1.json)('insights').$type(),
    issues: (0, pg_core_1.json)('issues').$type(),
    patterns: (0, pg_core_1.json)('patterns').$type(),
    recommendations: (0, pg_core_1.text)('recommendations').array(),
    // Metadata
    modelUsed: (0, pg_core_1.varchar)('model_used', { length: 50 }), // Which LLM reviewed
    processingTimeMs: (0, pg_core_1.integer)('processing_time_ms'),
    tokenCount: (0, pg_core_1.integer)('token_count'),
    reviewCost: (0, pg_core_1.decimal)('review_cost', { precision: 10, scale: 6 }),
    // Human Review
    humanAgreement: (0, pg_core_1.boolean)('human_agreement'), // Did human agree with LLM?
    humanNotes: (0, pg_core_1.text)('human_notes'),
    tags: (0, pg_core_1.text)('tags').array(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => {
    return {
        sessionIdx: (0, pg_core_1.index)('idx_reviews_session').on(table.sessionId),
        createdIdx: (0, pg_core_1.index)('idx_reviews_created').on(table.createdAt),
        escalationIdx: (0, pg_core_1.index)('idx_reviews_needs_escalation').on(table.needsEscalation),
    };
});
// Review Queue Table
exports.reviewQueue = (0, pg_core_1.pgTable)('review_queue', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull(),
    priority: (0, pg_core_1.integer)('priority').notNull().default(50), // 0-100, higher = urgent
    reason: (0, pg_core_1.varchar)('reason', { length: 100 }), // Why it needs review
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending'), // pending, in_progress, completed, skipped
    assignedTo: (0, pg_core_1.uuid)('assigned_to').references(() => schema_1.user.id),
    assignedAt: (0, pg_core_1.timestamp)('assigned_at'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    // Additional context
    triggerType: (0, pg_core_1.varchar)('trigger_type', { length: 50 }), // 'frustration', 'abandonment', 'tool_thrashing', etc.
    metadata: (0, pg_core_1.json)('metadata').$type(),
}, (table) => {
    return {
        statusPriorityIdx: (0, pg_core_1.index)('idx_queue_status_priority').on(table.status, table.priority),
        sessionIdx: (0, pg_core_1.index)('idx_queue_session').on(table.sessionId),
    };
});
// Review Patterns Table (for tracking systemic issues)
exports.reviewPatterns = (0, pg_core_1.pgTable)('review_patterns', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    patternType: (0, pg_core_1.varchar)('pattern_type', { length: 50 }), // 'tool_failure', 'confusion_point', etc.
    description: (0, pg_core_1.text)('description'),
    frequency: (0, pg_core_1.integer)('frequency').default(1),
    firstSeen: (0, pg_core_1.timestamp)('first_seen'),
    lastSeen: (0, pg_core_1.timestamp)('last_seen'),
    sessions: (0, pg_core_1.uuid)('sessions').array(), // Array of affected session IDs
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active'), // active, resolved, monitoring
    resolution: (0, pg_core_1.text)('resolution'),
    // Pattern details
    affectedTools: (0, pg_core_1.text)('affected_tools').array(),
    commonPhrases: (0, pg_core_1.text)('common_phrases').array(),
    averageSeverity: (0, pg_core_1.decimal)('average_severity', { precision: 3, scale: 2 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => {
    return {
        typeStatusIdx: (0, pg_core_1.index)('idx_patterns_type_status').on(table.patternType, table.status),
    };
});
// Daily Review Metrics (materialized view equivalent)
exports.dailyReviewMetrics = (0, pg_core_1.pgTable)('daily_review_metrics', {
    id: (0, pg_core_1.uuid)('id').primaryKey().notNull().defaultRandom(),
    date: (0, pg_core_1.timestamp)('date').notNull(),
    // Volume metrics
    totalSessions: (0, pg_core_1.integer)('total_sessions').notNull().default(0),
    reviewedSessions: (0, pg_core_1.integer)('reviewed_sessions').notNull().default(0),
    humanReviews: (0, pg_core_1.integer)('human_reviews').notNull().default(0),
    automatedReviews: (0, pg_core_1.integer)('automated_reviews').notNull().default(0),
    // Quality metrics
    avgPedagogicalScore: (0, pg_core_1.decimal)('avg_pedagogical_score', { precision: 5, scale: 2 }),
    avgEngagementScore: (0, pg_core_1.decimal)('avg_engagement_score', { precision: 5, scale: 2 }),
    avgEmotionalSupport: (0, pg_core_1.decimal)('avg_emotional_support', { precision: 5, scale: 2 }),
    // Issue metrics
    escalatedCount: (0, pg_core_1.integer)('escalated_count').notNull().default(0),
    frustrationEvents: (0, pg_core_1.integer)('frustration_events').notNull().default(0),
    abandonedSessions: (0, pg_core_1.integer)('abandoned_sessions').notNull().default(0),
    toolFailures: (0, pg_core_1.integer)('tool_failures').notNull().default(0),
    // Cost metrics
    totalReviewCost: (0, pg_core_1.decimal)('total_review_cost', { precision: 10, scale: 2 }),
    avgReviewTime: (0, pg_core_1.integer)('avg_review_time_ms'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (table) => {
    return {
        dateIdx: (0, pg_core_1.index)('idx_metrics_date').on(table.date),
    };
});
