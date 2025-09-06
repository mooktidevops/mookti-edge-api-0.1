/**
 * Growth Compass Integration with Ellen Sessions
 * 
 * Tracks and stores learning metrics from Ellen interactions
 * to calculate Growth Velocity and provide personalized insights
 */

import { kv } from '@vercel/kv';
import { GrowthCompass, GrowthVelocity, LearningPattern } from './types';

export interface SessionMetrics {
  sessionId: string;
  timestamp: Date;
  duration: number; // minutes
  toolsUsed: string[];
  strugglesIdentified: number;
  breakthroughMoments: number;
  questionsAsked: number;
  reflectionDepth: number; // 1-5 scale
  conceptsConnected: number;
  practiceCompleted: boolean;
}

// Define EllenSession interface locally for integration
export interface EllenSession {
  sessionId: string;
  userId: string;
  sessionGoal?: string;
  messages: Array<{ role: string; content: string }>;
  createdAt: Date;
}

export interface GrowthCompassUpdate {
  userId: string;
  sessionMetrics: SessionMetrics;
  ellenSession: EllenSession;
}

/**
 * Service to integrate Ellen sessions with Growth Compass tracking
 */
export class GrowthCompassEllenIntegration {
  private readonly COMPASS_PREFIX = 'growth:compass:';
  private readonly METRICS_PREFIX = 'growth:metrics:';
  private readonly PATTERN_PREFIX = 'growth:patterns:';

  /**
   * Update Growth Compass based on Ellen session activity
   */
  async updateFromSession(update: GrowthCompassUpdate): Promise<GrowthCompass> {
    const { userId, sessionMetrics, ellenSession } = update;
    
    // Get or create Growth Compass
    let compass = await this.getCompass(userId);
    if (!compass) {
      compass = this.initializeCompass(userId);
    }

    // Calculate component contributions from session
    const contributions = this.calculateContributions(sessionMetrics, ellenSession);
    
    // Update Growth Compass components
    compass = this.updateComponents(compass, contributions);
    
    // Detect and store patterns
    const patterns = await this.detectPatterns(userId, sessionMetrics);
    if (patterns.length > 0) {
      await this.storePatterns(userId, patterns);
    }
    
    // Calculate new Growth Velocity
    compass.growthVelocity = this.calculateGrowthVelocity(compass);
    
    // Store updated compass
    await this.storeCompass(compass);
    
    // Store session metrics for history
    await this.storeSessionMetrics(userId, sessionMetrics);
    
    return compass;
  }

  /**
   * Calculate how this session contributes to Growth Compass components
   */
  private calculateContributions(
    metrics: SessionMetrics,
    session: EllenSession
  ): ComponentContributions {
    return {
      // Goal Alignment: Based on session goal clarity and achievement
      goalAlignment: this.calculateGoalAlignment(session),
      
      // Balance Index: Tool diversity and approach variety
      balanceIndex: this.calculateBalance(metrics.toolsUsed),
      
      // Depth Score: Reflection quality and conceptual connections
      depthScore: this.calculateDepth(metrics),
      
      // Recovery/Engagement: Persistence through struggles
      recoveryEngagement: this.calculateRecovery(metrics),
      
      // Reflection Quality: Self-assessment accuracy
      reflectionQuality: metrics.reflectionDepth / 5,
      
      // Connection Strength: Cross-domain links made
      connectionStrength: Math.min(metrics.conceptsConnected / 10, 1)
    };
  }

  private calculateGoalAlignment(session: EllenSession): number {
    // Check if session had clear goals and if they were met
    const hasGoal = session.sessionGoal && session.sessionGoal.length > 0;
    const goalsAddressed = session.messages.filter(m => 
      m.role === 'assistant' && 
      m.content.toLowerCase().includes('goal') ||
      m.content.toLowerCase().includes('objective')
    ).length;
    
    if (!hasGoal) return 0.3; // Unfocused session
    if (goalsAddressed === 0) return 0.5; // Had goal but didn't address
    return Math.min(0.7 + (goalsAddressed * 0.1), 1); // Goal-focused work
  }

  private calculateBalance(toolsUsed: string[]): number {
    const uniqueTools = new Set(toolsUsed);
    const diversity = uniqueTools.size;
    
    // Reward tool diversity
    if (diversity === 1) return 0.4;
    if (diversity === 2) return 0.6;
    if (diversity === 3) return 0.8;
    return 1.0; // 4+ different tools
  }

  private calculateDepth(metrics: SessionMetrics): number {
    const factors = [
      metrics.reflectionDepth / 5,
      Math.min(metrics.conceptsConnected / 5, 1),
      metrics.breakthroughMoments > 0 ? 0.8 : 0.4
    ];
    
    return factors.reduce((a, b) => a + b) / factors.length;
  }

  private calculateRecovery(metrics: SessionMetrics): number {
    if (metrics.strugglesIdentified === 0) return 0.5; // No struggles = no recovery needed
    
    const recoveryRate = metrics.breakthroughMoments / metrics.strugglesIdentified;
    return Math.min(0.3 + (recoveryRate * 0.7), 1);
  }

  /**
   * Update Growth Compass components with new contributions
   */
  private updateComponents(
    compass: GrowthCompass,
    contributions: ComponentContributions
  ): GrowthCompass {
    // Use exponential moving average for smooth updates
    const alpha = 0.3; // Weight for new data
    
    compass.components.goalAlignment = 
      alpha * contributions.goalAlignment + 
      (1 - alpha) * compass.components.goalAlignment;
    
    compass.components.balanceIndex = 
      alpha * contributions.balanceIndex + 
      (1 - alpha) * compass.components.balanceIndex;
    
    compass.components.depthScore = 
      alpha * contributions.depthScore + 
      (1 - alpha) * compass.components.depthScore;
    
    compass.components.recoveryEngagement = 
      alpha * contributions.recoveryEngagement + 
      (1 - alpha) * compass.components.recoveryEngagement;
    
    compass.components.reflectionQuality = 
      alpha * contributions.reflectionQuality + 
      (1 - alpha) * compass.components.reflectionQuality;
    
    compass.components.connectionStrength = 
      alpha * contributions.connectionStrength + 
      (1 - alpha) * compass.components.connectionStrength;
    
    compass.lastUpdated = new Date();
    
    return compass;
  }

  /**
   * Calculate Growth Velocity from current component values
   */
  private calculateGrowthVelocity(compass: GrowthCompass): GrowthVelocity {
    const components = compass.components;
    
    // Weighted average with emphasis on goal alignment and depth
    const current = (
      components.goalAlignment * 0.25 +
      components.balanceIndex * 0.15 +
      components.depthScore * 0.25 +
      components.recoveryEngagement * 0.15 +
      components.reflectionQuality * 0.10 +
      components.connectionStrength * 0.10
    );
    
    // Calculate trend (requires history)
    const trend = this.calculateTrend(compass);
    
    // Momentum considers consistency
    const momentum = current * trend;
    
    return {
      current: Math.round(current * 100),
      trend,
      momentum: Math.round(momentum * 100),
      projection: this.projectGrowth(current, trend)
    };
  }

  private calculateTrend(compass: GrowthCompass): number {
    // In production, this would compare to historical values
    // For now, return neutral trend
    return 1.0;
  }

  private projectGrowth(current: number, trend: number): string {
    const projected = current * Math.pow(trend, 7); // Weekly projection
    
    if (projected > current * 1.1) return 'Accelerating';
    if (projected > current) return 'Steady Growth';
    if (projected > current * 0.9) return 'Maintaining';
    return 'Needs Attention';
  }

  /**
   * Detect learning patterns from session metrics
   */
  private async detectPatterns(
    userId: string,
    metrics: SessionMetrics
  ): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    
    // Deep Diver pattern
    if (metrics.reflectionDepth >= 4 && metrics.conceptsConnected >= 3) {
      patterns.push({
        type: 'deep_diver',
        strength: 0.8,
        frequency: 1,
        lastSeen: new Date(),
        description: 'Consistently explores concepts deeply'
      });
    }
    
    // Persistent Learner pattern
    if (metrics.strugglesIdentified > 0 && 
        metrics.breakthroughMoments / metrics.strugglesIdentified > 0.5) {
      patterns.push({
        type: 'persistent_learner',
        strength: 0.9,
        frequency: 1,
        lastSeen: new Date(),
        description: 'Pushes through difficulties effectively'
      });
    }
    
    // Connector pattern
    if (metrics.conceptsConnected >= 5) {
      patterns.push({
        type: 'connector',
        strength: 0.7,
        frequency: 1,
        lastSeen: new Date(),
        description: 'Makes cross-domain connections naturally'
      });
    }
    
    return patterns;
  }

  /**
   * Initialize a new Growth Compass for a user
   */
  private initializeCompass(userId: string): GrowthCompass {
    return {
      userId,
      components: {
        goalAlignment: 0.5,
        balanceIndex: 0.5,
        depthScore: 0.5,
        recoveryEngagement: 0.5,
        reflectionQuality: 0.5,
        connectionStrength: 0.5
      },
      growthVelocity: {
        current: 50,
        trend: 1.0,
        momentum: 50,
        projection: 'Starting Journey'
      },
      patterns: [],
      lastUpdated: new Date(),
      createdAt: new Date()
    };
  }

  /**
   * Storage operations
   */
  private async getCompass(userId: string): Promise<GrowthCompass | null> {
    try {
      const key = `${this.COMPASS_PREFIX}${userId}`;
      return await kv.get<GrowthCompass>(key);
    } catch (error) {
      console.error('Error fetching Growth Compass:', error);
      return null;
    }
  }

  private async storeCompass(compass: GrowthCompass): Promise<void> {
    try {
      const key = `${this.COMPASS_PREFIX}${compass.userId}`;
      await kv.set(key, compass, {
        ex: 60 * 60 * 24 * 90 // 90 days TTL
      });
    } catch (error) {
      console.error('Error storing Growth Compass:', error);
    }
  }

  private async storeSessionMetrics(
    userId: string,
    metrics: SessionMetrics
  ): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}${userId}:${metrics.sessionId}`;
      await kv.set(key, metrics, {
        ex: 60 * 60 * 24 * 30 // 30 days TTL
      });
    } catch (error) {
      console.error('Error storing session metrics:', error);
    }
  }

  private async storePatterns(
    userId: string,
    patterns: LearningPattern[]
  ): Promise<void> {
    try {
      const key = `${this.PATTERN_PREFIX}${userId}`;
      const existing = await kv.get<LearningPattern[]>(key) || [];
      
      // Merge patterns, updating existing ones
      const patternMap = new Map<string, LearningPattern>();
      
      existing.forEach(p => patternMap.set(p.type, p));
      patterns.forEach(p => {
        const existing = patternMap.get(p.type);
        if (existing) {
          // Update existing pattern
          existing.frequency++;
          existing.strength = (existing.strength + p.strength) / 2;
          existing.lastSeen = p.lastSeen;
        } else {
          patternMap.set(p.type, p);
        }
      });
      
      await kv.set(key, Array.from(patternMap.values()), {
        ex: 60 * 60 * 24 * 90 // 90 days TTL
      });
    } catch (error) {
      console.error('Error storing patterns:', error);
    }
  }

  /**
   * Get Growth Compass history for a user
   */
  async getHistory(
    userId: string,
    days: number = 30
  ): Promise<SessionMetrics[]> {
    try {
      const pattern = `${this.METRICS_PREFIX}${userId}:*`;
      const keys = await kv.keys(pattern);
      
      const metrics: SessionMetrics[] = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      for (const key of keys) {
        const metric = await kv.get<SessionMetrics>(key);
        if (metric && new Date(metric.timestamp) > cutoffDate) {
          metrics.push(metric);
        }
      }
      
      return metrics.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }

  /**
   * Generate insights based on Growth Compass state
   */
  generateInsights(compass: GrowthCompass): string[] {
    const insights: string[] = [];
    const components = compass.components;
    
    // Goal alignment insights
    if (components.goalAlignment < 0.5) {
      insights.push('Consider setting clearer learning objectives at the start of each session');
    } else if (components.goalAlignment > 0.8) {
      insights.push('Excellent goal focus! Your directed learning is paying off');
    }
    
    // Balance insights
    if (components.balanceIndex < 0.5) {
      insights.push('Try varying your learning approaches for better retention');
    }
    
    // Depth insights
    if (components.depthScore > 0.7) {
      insights.push('Your deep thinking is a strength - keep exploring connections');
    }
    
    // Recovery insights
    if (components.recoveryEngagement > 0.7) {
      insights.push('Your persistence through challenges is admirable');
    }
    
    // Pattern-based insights
    compass.patterns.forEach(pattern => {
      if (pattern.strength > 0.7) {
        insights.push(`Strong ${pattern.type.replace('_', ' ')} pattern detected`);
      }
    });
    
    return insights;
  }
}

// Type definitions
interface ComponentContributions {
  goalAlignment: number;
  balanceIndex: number;
  depthScore: number;
  recoveryEngagement: number;
  reflectionQuality: number;
  connectionStrength: number;
}

// Export singleton
export const growthCompassIntegration = new GrowthCompassEllenIntegration();