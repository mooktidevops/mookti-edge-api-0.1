import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import type {
  GrowthCompassData,
  SessionData,
  RecoveryActivity,
  PowerPattern,
  Season,
  GrowthVelocity,
  BalanceDistribution,
  RhythmData,
  SyncScore,
  OptimalWindow,
  HeatmapCell,
  NotificationSettings,
  SessionSettings,
  PrivacySettings
} from './growth-compass-types';

export class GrowthCompassStorageService {
  private static instance: GrowthCompassStorageService;

  private constructor() {}

  public static getInstance(): GrowthCompassStorageService {
    if (!GrowthCompassStorageService.instance) {
      GrowthCompassStorageService.instance = new GrowthCompassStorageService();
    }
    return GrowthCompassStorageService.instance;
  }

  // Core Data Management
  async getGrowthCompassData(userId: string): Promise<GrowthCompassData | null> {
    const data = await kv.get<GrowthCompassData>(`growth:${userId}:data`);
    
    // If no data exists, create initial data structure
    if (!data) {
      return await this.initializeUserData(userId);
    }
    
    return data;
  }

  async updateGrowthCompassData(
    userId: string, 
    updates: Partial<GrowthCompassData>
  ): Promise<GrowthCompassData> {
    const currentData = await this.getGrowthCompassData(userId);
    const updatedData = { ...currentData, ...updates, userId, lastUpdated: Date.now() };
    
    await kv.set(`growth:${userId}:data`, updatedData);
    return updatedData as GrowthCompassData;
  }

  // Initialize new user with baseline data
  private async initializeUserData(userId: string): Promise<GrowthCompassData> {
    const initialData: GrowthCompassData = {
      userId,
      currentSeason: 'steady',
      seasonStartDate: new Date(),
      growthVelocity: {
        score: 50, // Start at neutral baseline
        trend: 'steady',
        components: {
          goalAlignment: 50,
          balanceIndex: 50,
          depthScore: 50,
          recoveryEngagement: 50,
          reflectionQuality: 50
        },
        lastUpdated: new Date()
      },
      balanceDistribution: {
        plan: 25,
        learn: 50,
        perform: 25
      },
      targetBalance: {
        plan: 25,
        learn: 50,
        perform: 25
      },
      rhythmData: {
        optimalWindows: [],
        actualSessions: [],
        heatmapData: this.initializeHeatmap()
      },
      syncScore: {
        value: 50, // Start at baseline
        level: 'improving',
        suggestions: []
      },
      powerPatterns: [],
      recoveryActivities: [],
      dataCollection: {
        firstSessionDate: null,
        totalSessions: 0,
        totalDaysActive: 0,
        weeksActive: 0,
        lastSessionDate: null
      },
      lastUpdated: Date.now()
    };

    await kv.set(`growth:${userId}:data`, initialData);
    return initialData;
  }

  // Session Management
  async addSession(userId: string, session: Omit<SessionData, 'id'>): Promise<SessionData> {
    const sessionWithId: SessionData = {
      ...session,
      id: uuidv4()
    };

    // Store individual session
    await kv.set(`growth:${userId}:session:${sessionWithId.id}`, sessionWithId);
    
    // Add to session list
    await kv.rpush(`growth:${userId}:sessions`, sessionWithId.id);
    
    // Update user's growth compass data
    await this.updateSessionMetrics(userId, sessionWithId);
    
    // Update data collection stats
    await this.updateDataCollectionStats(userId, sessionWithId);
    
    return sessionWithId;
  }

  async getSessions(
    userId: string, 
    limit?: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<SessionData[]> {
    const sessionIds = await kv.lrange<string>(`growth:${userId}:sessions`, 0, -1);
    if (!sessionIds || sessionIds.length === 0) return [];
    
    const sessions = await Promise.all(
      sessionIds.map(id => kv.get<SessionData>(`growth:${userId}:session:${id}`))
    );
    
    let validSessions = sessions.filter(s => s !== null) as SessionData[];
    
    // Filter by date range if provided
    if (startDate || endDate) {
      validSessions = validSessions.filter(session => {
        const sessionTime = new Date(session.startTime).getTime();
        const afterStart = !startDate || sessionTime >= startDate.getTime();
        const beforeEnd = !endDate || sessionTime <= endDate.getTime();
        return afterStart && beforeEnd;
      });
    }
    
    // Sort by start time (most recent first)
    validSessions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    // Apply limit if specified
    if (limit) {
      validSessions = validSessions.slice(0, limit);
    }
    
    return validSessions;
  }

  // Recovery Activities
  async addRecoveryActivity(
    userId: string, 
    activity: Omit<RecoveryActivity, 'id'>
  ): Promise<RecoveryActivity> {
    const activityWithId: RecoveryActivity = {
      ...activity,
      id: uuidv4()
    };

    await kv.set(`growth:${userId}:recovery:${activityWithId.id}`, activityWithId);
    await kv.rpush(`growth:${userId}:recovery`, activityWithId.id);
    
    // Update recovery engagement score
    await this.updateRecoveryEngagement(userId);
    
    return activityWithId;
  }

  async getRecoveryActivities(
    userId: string, 
    daysBack: number = 14
  ): Promise<RecoveryActivity[]> {
    const activityIds = await kv.lrange<string>(`growth:${userId}:recovery`, 0, -1);
    if (!activityIds || activityIds.length === 0) return [];
    
    const activities = await Promise.all(
      activityIds.map(id => kv.get<RecoveryActivity>(`growth:${userId}:recovery:${id}`))
    );
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    return activities
      .filter(a => a !== null && new Date(a!.timestamp) >= cutoffDate) as RecoveryActivity[];
  }

  // Power Patterns
  async addPowerPattern(userId: string, pattern: PowerPattern): Promise<PowerPattern> {
    await kv.set(`growth:${userId}:pattern:${pattern.id}`, pattern);
    await kv.sadd(`growth:${userId}:patterns`, pattern.id);
    
    const data = await this.getGrowthCompassData(userId);
    if (data) {
      data.powerPatterns.push(pattern);
      await this.updateGrowthCompassData(userId, { powerPatterns: data.powerPatterns });
    }
    
    return pattern;
  }

  async updatePowerPattern(
    userId: string, 
    patternId: string, 
    updates: Partial<PowerPattern>
  ): Promise<PowerPattern | null> {
    const pattern = await kv.get<PowerPattern>(`growth:${userId}:pattern:${patternId}`);
    if (!pattern) return null;
    
    const updatedPattern = { ...pattern, ...updates };
    await kv.set(`growth:${userId}:pattern:${patternId}`, updatedPattern);
    
    // Update in main data
    const data = await this.getGrowthCompassData(userId);
    if (data) {
      const index = data.powerPatterns.findIndex(p => p.id === patternId);
      if (index !== -1) {
        data.powerPatterns[index] = updatedPattern;
        await this.updateGrowthCompassData(userId, { powerPatterns: data.powerPatterns });
      }
    }
    
    return updatedPattern;
  }

  // Settings Management
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const settings = await kv.get<NotificationSettings>(`growth:${userId}:settings:notifications`);
    return settings || this.getDefaultNotificationSettings();
  }

  async updateNotificationSettings(
    userId: string, 
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const current = await this.getNotificationSettings(userId);
    const updated = { ...current, ...settings };
    await kv.set(`growth:${userId}:settings:notifications`, updated);
    return updated;
  }

  async getSessionSettings(userId: string): Promise<SessionSettings> {
    const settings = await kv.get<SessionSettings>(`growth:${userId}:settings:session`);
    return settings || this.getDefaultSessionSettings();
  }

  async updateSessionSettings(
    userId: string, 
    settings: Partial<SessionSettings>
  ): Promise<SessionSettings> {
    const current = await this.getSessionSettings(userId);
    const updated = { ...current, ...settings };
    await kv.set(`growth:${userId}:settings:session`, updated);
    return updated;
  }

  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    const settings = await kv.get<PrivacySettings>(`growth:${userId}:settings:privacy`);
    return settings || this.getDefaultPrivacySettings();
  }

  async updatePrivacySettings(
    userId: string, 
    settings: Partial<PrivacySettings>
  ): Promise<PrivacySettings> {
    const current = await this.getPrivacySettings(userId);
    const updated = { ...current, ...settings };
    await kv.set(`growth:${userId}:settings:privacy`, updated);
    return updated;
  }

  // Season Management
  async updateSeason(
    userId: string, 
    season: Season, 
    endDate?: Date
  ): Promise<GrowthCompassData> {
    const data = await this.getGrowthCompassData(userId);
    if (!data) throw new Error('User data not found');
    
    // Archive previous season if needed
    if (data.currentSeason !== season) {
      await this.archiveSeasonData(userId, data.currentSeason, data.seasonStartDate);
    }
    
    return await this.updateGrowthCompassData(userId, {
      currentSeason: season,
      seasonStartDate: new Date(),
      seasonEndDate: endDate
    });
  }

  // Helper Methods
  private async updateSessionMetrics(userId: string, session: SessionData): Promise<void> {
    const data = await this.getGrowthCompassData(userId);
    if (!data) return;
    
    // Update rhythm data
    const hour = new Date(session.startTime).getHours();
    const day = new Date(session.startTime).getDay();
    
    if (!data.rhythmData.heatmapData[day]) {
      data.rhythmData.heatmapData[day] = [];
    }
    
    const existingCell = data.rhythmData.heatmapData[day].find(c => c.hour === hour);
    if (existingCell) {
      existingCell.sessionCount++;
      existingCell.performance = (existingCell.performance + session.quality) / 2;
    } else {
      data.rhythmData.heatmapData[day].push({
        hour,
        day,
        performance: session.quality,
        sessionCount: 1
      });
    }
    
    // Add to actual sessions
    data.rhythmData.actualSessions.push(session);
    
    // Keep only last 100 sessions for performance
    if (data.rhythmData.actualSessions.length > 100) {
      data.rhythmData.actualSessions = data.rhythmData.actualSessions.slice(-100);
    }
    
    // Update balance distribution
    const totalMinutes = session.focusDuration;
    const currentTotal = Object.values(data.balanceDistribution).reduce((a, b) => a + b, 0);
    
    const weight = totalMinutes / (currentTotal + totalMinutes);
    const typeWeight = session.type === 'plan' ? [1, 0, 0] : 
                       session.type === 'learn' ? [0, 1, 0] : [0, 0, 1];
    
    data.balanceDistribution.plan = data.balanceDistribution.plan * (1 - weight) + typeWeight[0] * 100 * weight;
    data.balanceDistribution.learn = data.balanceDistribution.learn * (1 - weight) + typeWeight[1] * 100 * weight;
    data.balanceDistribution.perform = data.balanceDistribution.perform * (1 - weight) + typeWeight[2] * 100 * weight;
    
    await this.updateGrowthCompassData(userId, {
      rhythmData: data.rhythmData,
      balanceDistribution: data.balanceDistribution
    });
  }

  private async updateDataCollectionStats(userId: string, session: SessionData): Promise<void> {
    const data = await this.getGrowthCompassData(userId);
    if (!data) return;
    
    const stats = data.dataCollection || {
      firstSessionDate: null,
      totalSessions: 0,
      totalDaysActive: 0,
      weeksActive: 0,
      lastSessionDate: null
    };
    
    // Update first session date
    if (!stats.firstSessionDate) {
      stats.firstSessionDate = session.startTime;
    }
    
    // Update total sessions
    stats.totalSessions++;
    
    // Update last session date
    stats.lastSessionDate = session.startTime;
    
    // Calculate unique days active
    const sessions = await this.getSessions(userId);
    const uniqueDays = new Set(
      sessions.map(s => new Date(s.startTime).toDateString())
    );
    stats.totalDaysActive = uniqueDays.size;
    
    // Calculate weeks active
    if (stats.firstSessionDate) {
      const weeksDiff = Math.floor(
        (new Date().getTime() - new Date(stats.firstSessionDate).getTime()) / 
        (1000 * 60 * 60 * 24 * 7)
      );
      stats.weeksActive = Math.max(1, weeksDiff);
    }
    
    await this.updateGrowthCompassData(userId, { dataCollection: stats });
  }

  private async updateRecoveryEngagement(userId: string): Promise<void> {
    const activities = await this.getRecoveryActivities(userId, 14);
    const data = await this.getGrowthCompassData(userId);
    if (!data) return;
    
    // Calculate recovery engagement score
    const targetActivitiesPerWeek = 7;
    const actualActivities = activities.length;
    const engagementScore = Math.min(100, (actualActivities / (targetActivitiesPerWeek * 2)) * 100);
    
    data.growthVelocity.components.recoveryEngagement = engagementScore;
    await this.updateGrowthCompassData(userId, { growthVelocity: data.growthVelocity });
  }

  private async archiveSeasonData(userId: string, season: Season, startDate: Date): Promise<void> {
    const archiveKey = `growth:${userId}:archive:${season}:${startDate.getTime()}`;
    const data = await this.getGrowthCompassData(userId);
    
    if (data) {
      await kv.set(archiveKey, {
        season,
        startDate,
        endDate: new Date(),
        finalVelocity: data.growthVelocity,
        powerPatternsDiscovered: data.powerPatterns.length,
        totalSessions: data.dataCollection?.totalSessions || 0
      });
    }
  }

  private initializeHeatmap(): HeatmapCell[][] {
    const heatmap: HeatmapCell[][] = [];
    for (let day = 0; day < 7; day++) {
      heatmap[day] = [];
    }
    return heatmap;
  }

  private getDefaultNotificationSettings(): NotificationSettings {
    return {
      quietHours: {
        enabled: true,
        start: "22:00",
        end: "08:00",
        days: [0, 1, 2, 3, 4, 5, 6]
      },
      channels: {
        push: true,
        email: false
      },
      frequencyPerType: {
        rhythmReminders: 'medium',
        recoveryCelebrations: 'high',
        patternInsights: 'medium',
        seasonTransitions: 'high'
      },
      lowPressureMode: false
    };
  }

  private getDefaultSessionSettings(): SessionSettings {
    return {
      promptFrequency: 20,
      lowFrictionMode: false,
      defaultDuration: 45
    };
  }

  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      dataOptIn: {
        sessionTiming: true,
        performance: true,
        mood: false,
        stressSensing: false,
        reflectionText: false
      },
      onDeviceProcessing: true,
      dataRetentionDays: 90
    };
  }
}

export default GrowthCompassStorageService.getInstance();