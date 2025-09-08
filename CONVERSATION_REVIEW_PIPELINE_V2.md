# Conversation Review Pipeline - Implementation Plan V2
## Quality Assurance & Continuous Improvement System

### Executive Summary
A progressive review system that starts with 100% human review during early testing, then intelligently transitions to automated LLM-based review with strategic sampling as we scale. Built on a modular admin dashboard that will expand to handle all platform administration needs.

---

## 1. Implementation Phases

### Phase 0: Pre-Launch Critical (IMMEDIATE - Before Beta)
**Goal**: Basic quality monitoring capability for beta launch

#### Required Components:
1. **Database Schema** for reviews
2. **Review trigger** in session completion flow  
3. **Basic admin dashboard** with session viewer
4. **Human review queue** with tagging interface
5. **Critical issue alerting** via email/Slack

#### Deliverables:
- `/admin` dashboard with auth
- Session replay capability
- Issue tagging system
- Export capability for analysis

### Phase 1: Beta Learning (Week 1-2)
**Goal**: Learn from 100% human review of early conversations

#### Components:
1. **Enhanced review interface** with:
   - Bulk review workflows
   - Quick issue categorization
   - Pattern notation tools
   - Session comparison views

2. **Real-time quality signals**:
   - Frustration detection
   - Tool thrashing alerts
   - Abandonment risk scoring
   - Success pattern recognition

3. **Basic analytics**:
   - Daily quality trends
   - Common issue types
   - Tool effectiveness metrics
   - User satisfaction correlation

### Phase 2: Hybrid Automation (Week 3-4)
**Goal**: Introduce LLM review while maintaining human oversight

#### Components:
1. **LLM Classification System**:
   - Tier assignment logic
   - Sampling algorithms
   - Priority queuing

2. **Automated Analysis**:
   - Gemini 2.5 Flash for initial triage
   - O4-Mini for deep pedagogical review
   - Pattern extraction
   - Issue categorization

3. **Human-in-the-loop**:
   - LLM suggestion validation
   - Override capabilities
   - Training data generation

### Phase 3: Scaled Operations (Week 5+)
**Goal**: Fully automated review with strategic human involvement

#### Components:
1. **Smart Sampling**:
   - Dynamic sampling rates
   - Risk-based prioritization
   - Anomaly detection

2. **Automated Improvements**:
   - Pattern → Fix mapping
   - Prompt optimization
   - Tool threshold tuning
   - A/B testing framework

3. **Advanced Analytics**:
   - Predictive quality metrics
   - Cohort analysis
   - Learning outcome correlation
   - Cost optimization dashboard

---

## 2. Modular Admin Dashboard Architecture

### Core Structure
```
/admin
├── /dashboard          # Overview & metrics
├── /reviews           # Conversation review system
│   ├── /queue        # Human review queue
│   ├── /sessions     # Session browser
│   ├── /insights     # Analytics & patterns
│   └── /settings     # Review configuration
├── /content          # Content management
│   ├── /embeddings   # Voyage AI/Pinecone management
│   ├── /documents    # Document library
│   └── /seeds        # Coaching content seeds
├── /users            # User management
├── /settings         # Platform configuration
│   ├── /models       # AI model settings
│   ├── /features     # Feature flags
│   └── /limits       # Rate limits & quotas
└── /analytics        # Platform-wide analytics
```

### Technical Stack
- **Framework**: Next.js App Router (same as main app)
- **UI**: Shadcn/ui components for consistency
- **Auth**: Role-based access (admin, reviewer, viewer)
- **State**: React Query for data fetching
- **Charts**: Recharts for visualizations
- **Tables**: TanStack Table for data grids

---

## 3. Database Schema

```sql
-- Conversation Reviews Table
CREATE TABLE conversation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  reviewed_at TIMESTAMP DEFAULT NOW(),
  review_type VARCHAR(20) NOT NULL, -- 'human', 'automated', 'hybrid'
  review_tier VARCHAR(20), -- 'full', 'standard', 'light', 'skip'
  reviewer_id UUID REFERENCES users(id), -- For human reviews
  
  -- Quality Scores (0-100)
  pedagogical_effectiveness INT,
  student_engagement INT,
  conceptual_clarity INT,
  appropriate_challenge INT,
  emotional_support INT,
  
  -- Binary Flags
  learning_objective_met BOOLEAN,
  frustration_handled_well BOOLEAN,
  tool_selection_optimal BOOLEAN,
  needs_escalation BOOLEAN,
  
  -- Detailed Analysis
  insights JSONB, -- Structured insights
  issues JSONB[], -- Array of identified issues
  patterns JSONB[], -- Detected patterns
  recommendations TEXT[],
  
  -- Metadata
  model_used VARCHAR(50), -- Which LLM reviewed
  processing_time_ms INT,
  token_count INT,
  review_cost DECIMAL(10,6),
  
  -- Human Review
  human_agreement BOOLEAN, -- Did human agree with LLM?
  human_notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Review Queue Table
CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  priority INT NOT NULL DEFAULT 50, -- 0-100, higher = urgent
  reason VARCHAR(100), -- Why it needs review
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, skipped
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Review Patterns Table (for tracking systemic issues)
CREATE TABLE review_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR(50), -- 'tool_failure', 'confusion_point', etc.
  description TEXT,
  frequency INT DEFAULT 1,
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  sessions UUID[], -- Array of affected session IDs
  status VARCHAR(20) DEFAULT 'active', -- active, resolved, monitoring
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_reviews_session ON conversation_reviews(session_id);
CREATE INDEX idx_reviews_created ON conversation_reviews(created_at DESC);
CREATE INDEX idx_reviews_needs_escalation ON conversation_reviews(needs_escalation) WHERE needs_escalation = true;
CREATE INDEX idx_queue_status_priority ON review_queue(status, priority DESC);
CREATE INDEX idx_patterns_type_status ON review_patterns(pattern_type, status);
```

---

## 4. API Endpoints

### Review System APIs
```typescript
// Core Review Endpoints
POST   /api/admin/reviews/trigger        // Trigger review for session
POST   /api/admin/reviews/classify       // Classify session for review tier
POST   /api/admin/reviews/analyze        // Perform deep analysis
GET    /api/admin/reviews/queue          // Get human review queue
PUT    /api/admin/reviews/:id            // Update review (human input)
GET    /api/admin/reviews/insights       // Aggregated insights
GET    /api/admin/reviews/patterns       // Detected patterns

// Admin Dashboard APIs
GET    /api/admin/dashboard/stats        // Overview statistics
GET    /api/admin/sessions               // Browse all sessions
GET    /api/admin/sessions/:id           // Get session details
GET    /api/admin/users                  // User management
PUT    /api/admin/settings               // Update platform settings

// Content Management APIs
GET    /api/admin/content/embeddings     // List embeddings
POST   /api/admin/content/embeddings     // Generate new embeddings
DELETE /api/admin/content/embeddings/:id // Remove embeddings
PUT    /api/admin/content/documents/:id  // Update document
```

---

## 5. Review Triggers & Signals

### Automatic Review Triggers
```typescript
interface ReviewTriggers {
  // High Priority (100% review)
  highPriority: {
    frustrationScore: number >= 6;      // High frustration detected
    abandonedSession: messages < 6;     // Early abandonment
    toolSwitches: number > 3;           // Excessive tool switching
    userFeedback: 'negative' | 'report'; // Explicit negative feedback
    firstUserSessions: count <= 3;      // New user's early sessions
  };
  
  // Medium Priority (50% sample)
  mediumPriority: {
    sessionLength: messages >= 6 && messages <= 20;
    someConfusion: boolean;             // "I don't understand" detected
    toolSwitch: count === 1 || 2;      // Some adaptation needed
  };
  
  // Low Priority (10% sample)  
  lowPriority: {
    successfulSession: boolean;         // Completed with high ratings
    longSession: messages > 20;         // Extended engagement
    noIssuesDetected: boolean;         // Smooth interaction
  };
}
```

### Real-time Quality Signals
```typescript
interface QualitySignals {
  // Frustration Indicators
  frustration: {
    messageEdits: number;               // User editing messages
    confusionPhrases: string[];        // "I don't understand", "what?"
    responseTime: number;               // Long delays between messages
    abandonmentRisk: boolean;          // >2min pause mid-conversation
  };
  
  // Success Indicators
  success: {
    positivePhras: string[];           // "Thanks!", "Got it!", "Perfect!"
    highRatings: number >= 4;          // Confidence/understanding ratings
    completedGoals: boolean;           // Session objectives met
    smoothFlow: boolean;               // No tool switches or confusion
  };
  
  // Engagement Metrics
  engagement: {
    messageLength: number;              // Average message length
    questionCount: number;              // Student asking questions
    conceptsCovered: number;            // Breadth of learning
    activeParticipation: boolean;      // Not just "yes/no" responses
  };
}
```

---

## 6. Implementation Priority

### 🔴 CRITICAL - Before Beta Launch (Day 1-2)

```typescript
// 1. Add review trigger to session completion
// In /api/ellen/sessions/complete.ts
async function triggerReview(session: EllenSession) {
  // Check if review needed
  const reviewPriority = calculateReviewPriority(session);
  
  if (reviewPriority > 0) {
    await addToReviewQueue({
      sessionId: session.id,
      priority: reviewPriority,
      reason: determineReviewReason(session)
    });
  }
}

// 2. Create basic admin dashboard
// New file: /app/admin/page.tsx
// - Auth-protected admin route
// - Session list with filters
// - Click to view session details
// - Basic tagging interface

// 3. Database tables
// Run migrations for review tables

// 4. Review queue endpoint
// GET /api/admin/reviews/queue
// Returns pending reviews sorted by priority
```

### 🟡 IMPORTANT - Week 1

- Bulk review interface
- Pattern detection system
- Analytics dashboard
- LLM classification setup

### 🟢 NICE TO HAVE - Week 2+

- Automated analysis
- A/B testing framework
- Advanced analytics
- Content management UI

---

## 7. Success Metrics

### Launch Targets
- ✅ 100% of high-priority sessions reviewed within 6 hours
- ✅ <5% false positive rate for issue detection
- ✅ 90% human-LLM agreement rate (once automated)
- ✅ Review costs <2% of operational expenses

### Quality Improvements
- 📈 20% reduction in frustration events within 2 weeks
- 📈 15% improvement in session completion rates
- 📈 25% reduction in tool switching confusion
- 📈 30% increase in positive feedback

---

## 8. Monitoring & Alerting

### Critical Alerts (Immediate)
- Frustration spike (>10 sessions/hour)
- System-wide tool failure pattern
- Multiple abandoned sessions from same user
- Explicit safety/harm concerns

### Daily Reports
- Quality score trends
- Common issue categories
- Tool effectiveness metrics
- Reviewer productivity stats

### Weekly Analysis
- Pattern evolution
- Improvement impact measurement
- Cost optimization opportunities
- Model performance comparison

---

## Next Steps

1. **Immediate**: Implement critical database schema and review trigger
2. **Today**: Create basic admin dashboard with session viewer
3. **Tomorrow**: Build review queue and tagging system
4. **This Week**: Deploy to production with 100% human review
5. **Next Week**: Begin LLM integration testing

The modular dashboard architecture ensures we can easily add content management, user administration, and analytics features as the platform grows.