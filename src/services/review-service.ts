import { db } from '../lib/db';
import { conversationReviews, reviewQueue, reviewPatterns, dailyReviewMetrics } from '../lib/db/review-schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import type { EllenSession } from '../../lib/storage/ellen-session-types';

export interface ReviewTriggerResult {
  shouldReview: boolean;
  priority: number;
  reason: string;
  triggerType: string;
}

export interface QualitySignals {
  frustrationScore: number;
  abandonmentRisk: boolean;
  toolThrashing: boolean;
  successIndicators: number;
  engagementLevel: 'low' | 'medium' | 'high';
}

export class ConversationReviewService {
  // Analyze session to determine if review is needed
  async analyzeSessionForReview(session: EllenSession): Promise<ReviewTriggerResult> {
    const signals = this.extractQualitySignals(session);
    
    // High priority triggers (100% review)
    if (signals.frustrationScore >= 6) {
      return {
        shouldReview: true,
        priority: 90,
        reason: `High frustration detected (score: ${signals.frustrationScore})`,
        triggerType: 'frustration'
      };
    }
    
    if (session.messages.length < 6 && session.status === 'completed') {
      return {
        shouldReview: true,
        priority: 85,
        reason: 'Session abandoned early',
        triggerType: 'abandonment'
      };
    }
    
    if (signals.toolThrashing) {
      return {
        shouldReview: true,
        priority: 80,
        reason: 'Excessive tool switching detected',
        triggerType: 'tool_thrashing'
      };
    }
    
    // First few sessions for a user (if we can track this)
    const userSessionCount = await this.getUserSessionCount(session.userId);
    if (userSessionCount <= 3) {
      return {
        shouldReview: true,
        priority: 75,
        reason: `Early user session (#${userSessionCount})`,
        triggerType: 'new_user'
      };
    }
    
    // Medium priority triggers (50% sampling)
    if (session.messages.length >= 6 && session.messages.length <= 20) {
      const shouldSample = Math.random() < 0.5;
      if (shouldSample) {
        return {
          shouldReview: true,
          priority: 50,
          reason: 'Standard session sampled for review',
          triggerType: 'standard_sample'
        };
      }
    }
    
    // Low priority triggers (10% sampling)
    if (signals.successIndicators >= 3 && signals.engagementLevel === 'high') {
      const shouldSample = Math.random() < 0.1;
      if (shouldSample) {
        return {
          shouldReview: true,
          priority: 30,
          reason: 'Successful session sampled for review',
          triggerType: 'success_sample'
        };
      }
    }
    
    // Skip review
    return {
      shouldReview: false,
      priority: 0,
      reason: 'No review triggers met',
      triggerType: 'skip'
    };
  }
  
  // Extract quality signals from session
  private extractQualitySignals(session: EllenSession): QualitySignals {
    let frustrationScore = 0;
    let successIndicators = 0;
    let toolSwitches = 0;
    let lastTool = '';
    
    // Analyze messages for signals
    session.messages.forEach((msg, index) => {
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        
        // Frustration indicators
        if (content.includes("don't understand") || 
            content.includes("confused") || 
            content.includes("what?") ||
            content.includes("this doesn't make sense")) {
          frustrationScore += 2;
        }
        
        if (content.includes("help") || 
            content.includes("stuck") || 
            content.includes("lost")) {
          frustrationScore += 1;
        }
        
        // Success indicators
        if (content.includes("thanks") || 
            content.includes("got it") || 
            content.includes("perfect") ||
            content.includes("makes sense") ||
            content.includes("understand")) {
          successIndicators += 1;
        }
      }
      
      // Track tool switches (if tools are tracked in metadata)
      if ((msg.metadata as any)?.tool && (msg.metadata as any).tool !== lastTool) {
        toolSwitches++;
        lastTool = (msg.metadata as any).tool;
      }
    });
    
    // Check for abandonment risk (long pauses)
    let abandonmentRisk = false;
    for (let i = 1; i < session.messages.length; i++) {
      const timeDiff = new Date(session.messages[i].timestamp).getTime() - 
                       new Date(session.messages[i-1].timestamp).getTime();
      if (timeDiff > 120000) { // 2 minutes
        abandonmentRisk = true;
        break;
      }
    }
    
    // Determine engagement level
    const avgMessageLength = session.messages
      .filter(m => m.role === 'user')
      .reduce((acc, m) => acc + m.content.length, 0) / 
      Math.max(1, session.messages.filter(m => m.role === 'user').length);
    
    const engagementLevel = avgMessageLength > 100 ? 'high' : 
                           avgMessageLength > 50 ? 'medium' : 'low';
    
    return {
      frustrationScore: Math.min(10, frustrationScore),
      abandonmentRisk,
      toolThrashing: toolSwitches > 3,
      successIndicators,
      engagementLevel
    };
  }
  
  // Add session to review queue
  async addToReviewQueue(
    sessionId: string, 
    trigger: ReviewTriggerResult,
    metadata?: any
  ): Promise<void> {
    try {
      await db.insert(reviewQueue).values({
        sessionId,
        priority: trigger.priority,
        reason: trigger.reason,
        triggerType: trigger.triggerType,
        status: 'pending',
        metadata: metadata || {},
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Failed to add to review queue:', error);
      throw error;
    }
  }
  
  // Get pending reviews for human reviewer
  async getReviewQueue(limit: number = 10): Promise<any[]> {
    try {
      const queue = await db
        .select()
        .from(reviewQueue)
        .where(eq(reviewQueue.status, 'pending'))
        .orderBy(desc(reviewQueue.priority), reviewQueue.createdAt)
        .limit(limit);
      
      return queue;
    } catch (error) {
      console.error('Failed to get review queue:', error);
      return [];
    }
  }
  
  // Assign review to a reviewer
  async assignReview(queueId: string, reviewerId: string): Promise<boolean> {
    try {
      const result = await db
        .update(reviewQueue)
        .set({
          assignedTo: reviewerId,
          assignedAt: new Date(),
          status: 'in_progress'
        })
        .where(and(
          eq(reviewQueue.id, queueId),
          eq(reviewQueue.status, 'pending')
        ));
      
      return true;
    } catch (error) {
      console.error('Failed to assign review:', error);
      return false;
    }
  }
  
  // Submit a human review
  async submitHumanReview(
    queueId: string,
    sessionId: string,
    review: {
      scores: {
        pedagogicalEffectiveness?: number;
        studentEngagement?: number;
        conceptualClarity?: number;
        appropriateChallenge?: number;
        emotionalSupport?: number;
      };
      flags: {
        learningObjectiveMet?: boolean;
        frustrationHandledWell?: boolean;
        toolSelectionOptimal?: boolean;
        needsEscalation?: boolean;
      };
      insights?: any;
      issues?: any[];
      recommendations?: string[];
      humanNotes?: string;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      // Create the review record
      await db.insert(conversationReviews).values({
        sessionId,
        reviewType: 'human',
        reviewedAt: new Date(),
        ...review.scores,
        ...review.flags,
        insights: review.insights || {},
        issues: review.issues || [],
        recommendations: review.recommendations || [],
        humanNotes: review.humanNotes,
        tags: review.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Mark queue item as completed
      await db
        .update(reviewQueue)
        .set({
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(reviewQueue.id, queueId));
      
      // Check for patterns
      if (review.issues && review.issues.length > 0) {
        await this.updatePatterns(review.issues, sessionId);
      }
    } catch (error) {
      console.error('Failed to submit human review:', error);
      throw error;
    }
  }
  
  // Update pattern detection
  private async updatePatterns(issues: any[], sessionId: string): Promise<void> {
    for (const issue of issues) {
      if (issue.type && issue.severity !== 'low') {
        // Check if pattern exists
        const existing = await db
          .select()
          .from(reviewPatterns)
          .where(and(
            eq(reviewPatterns.patternType, issue.type),
            eq(reviewPatterns.status, 'active')
          ))
          .limit(1);
        
        if (existing.length > 0) {
          // Update existing pattern
          const pattern = existing[0];
          await db
            .update(reviewPatterns)
            .set({
              frequency: (pattern.frequency || 0) + 1,
              lastSeen: new Date(),
              sessions: [...(pattern.sessions || []), sessionId],
              updatedAt: new Date()
            })
            .where(eq(reviewPatterns.id, pattern.id));
        } else {
          // Create new pattern
          await db.insert(reviewPatterns).values({
            patternType: issue.type,
            description: issue.description,
            frequency: 1,
            firstSeen: new Date(),
            lastSeen: new Date(),
            sessions: [sessionId],
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
  }
  
  // Get user session count (helper)
  private async getUserSessionCount(userId: string): Promise<number> {
    // This would need to query the session storage
    // For now, returning a placeholder
    return 10; // TODO: Implement actual count
  }
  
  // Get review statistics
  async getReviewStats(days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    try {
      const metrics = await db
        .select()
        .from(dailyReviewMetrics)
        .where(gte(dailyReviewMetrics.date, startDate))
        .orderBy(desc(dailyReviewMetrics.date));
      
      const recentReviews = await db
        .select()
        .from(conversationReviews)
        .where(gte(conversationReviews.createdAt, startDate));
      
      const activePatterns = await db
        .select()
        .from(reviewPatterns)
        .where(eq(reviewPatterns.status, 'active'))
        .orderBy(desc(reviewPatterns.frequency));
      
      return {
        dailyMetrics: metrics,
        totalReviews: recentReviews.length,
        averageScores: {
          pedagogical: recentReviews.reduce((acc, r) => acc + (r.pedagogicalEffectiveness || 0), 0) / recentReviews.length,
          engagement: recentReviews.reduce((acc, r) => acc + (r.studentEngagement || 0), 0) / recentReviews.length,
        },
        activePatterns: activePatterns.slice(0, 5),
        escalatedCount: recentReviews.filter(r => r.needsEscalation).length
      };
    } catch (error) {
      console.error('Failed to get review stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const reviewService = new ConversationReviewService();