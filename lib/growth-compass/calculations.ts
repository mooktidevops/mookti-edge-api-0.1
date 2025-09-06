import type { 
  GrowthVelocityComponents, 
  Season,
  SessionData,
  RecoveryActivity,
  BalanceDistribution 
} from '../storage/growth-compass-types';

// Season-aware weight configurations
const SEASON_WEIGHTS = {
  sprint: {
    goalAlignment: 0.45,
    balanceIndex: 0.20,
    depthScore: 0.25,
    recoveryEngagement: 0.05,
    reflectionQuality: 0.05
  },
  steady: {
    goalAlignment: 0.35,
    balanceIndex: 0.25,
    depthScore: 0.20,
    recoveryEngagement: 0.10,
    reflectionQuality: 0.10
  },
  recovery: {
    goalAlignment: 0.15,
    balanceIndex: 0.20,
    depthScore: 0.15,
    recoveryEngagement: 0.40,
    reflectionQuality: 0.10
  },
  transition: {
    goalAlignment: 0.20,
    balanceIndex: 0.20,
    depthScore: 0.20,
    recoveryEngagement: 0.10,
    reflectionQuality: 0.30
  }
};

export function calculateGrowthVelocity(
  components: GrowthVelocityComponents,
  season: Season = 'steady'
): number {
  const weights = SEASON_WEIGHTS[season];
  
  return Math.round(
    components.goalAlignment * weights.goalAlignment +
    components.balanceIndex * weights.balanceIndex +
    components.depthScore * weights.depthScore +
    components.recoveryEngagement * weights.recoveryEngagement +
    components.reflectionQuality * weights.reflectionQuality
  );
}

export function calculateGoalAlignment(
  completedTasks: number,
  plannedTasks: number,
  actualTime: number,
  plannedTime: number
): number {
  if (plannedTasks === 0) return 50; // Baseline when no tasks planned
  
  const completionRate = Math.min(1, completedTasks / plannedTasks);
  const timeAlignment = plannedTime > 0 ? Math.min(1.5, actualTime / plannedTime) : 1;
  
  // Quality multiplier based on time spent
  const qualityMultiplier = timeAlignment < 0.5 ? 0.8 :
                            timeAlignment > 1.5 ? 0.9 :
                            1.0 + (0.2 * Math.abs(1 - timeAlignment));
  
  return Math.round(completionRate * 100 * qualityMultiplier);
}

export function calculateBalanceIndex(
  actual: BalanceDistribution,
  target: BalanceDistribution
): number {
  const planDiff = Math.abs(actual.plan - target.plan);
  const learnDiff = Math.abs(actual.learn - target.learn);
  const performDiff = Math.abs(actual.perform - target.perform);
  
  const totalDiff = planDiff + learnDiff + performDiff;
  
  // Convert difference to score (0 diff = 100 score, 100 diff = 0 score)
  return Math.max(0, Math.round(100 - (totalDiff * 0.5)));
}

export function calculateDepthScore(
  focusMinutes: number[],
  taskComplexity: number[], // 1-5 scale
  understandingRatings: number[] // 1-5 scale
): number {
  if (focusMinutes.length === 0) return 50; // Baseline
  
  // Average focus duration (normalized to 0-100, with 90 min = 100)
  const avgFocus = focusMinutes.reduce((a, b) => a + b, 0) / focusMinutes.length;
  const focusScore = Math.min(100, (avgFocus / 90) * 100);
  
  // Average complexity (normalized to 0-100)
  const avgComplexity = taskComplexity.length > 0 ?
    (taskComplexity.reduce((a, b) => a + b, 0) / taskComplexity.length) * 20 : 50;
  
  // Average understanding (normalized to 0-100)
  const avgUnderstanding = understandingRatings.length > 0 ?
    (understandingRatings.reduce((a, b) => a + b, 0) / understandingRatings.length) * 20 : 50;
  
  return Math.round(
    focusScore * 0.4 +
    avgComplexity * 0.3 +
    avgUnderstanding * 0.3
  );
}

export function calculateRecoveryEngagement(
  activities: RecoveryActivity[],
  targetPerWeek: number = 7
): number {
  // Count activities in last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const recentActivities = activities.filter(
    a => new Date(a.timestamp) >= twoWeeksAgo
  );
  
  // Calculate engagement score
  const actualCount = recentActivities.length;
  const targetCount = targetPerWeek * 2;
  
  // Bonus for variety
  const uniqueTypes = new Set(recentActivities.map(a => a.type)).size;
  const varietyBonus = Math.min(20, uniqueTypes * 4);
  
  const baseScore = Math.min(80, (actualCount / targetCount) * 80);
  
  return Math.round(baseScore + varietyBonus);
}

export function calculateReflectionQuality(
  reflectionTexts: string[],
  onDevice: boolean = true
): number {
  if (reflectionTexts.length === 0) return 50; // Baseline
  
  if (onDevice) {
    // Simple on-device heuristics
    let totalScore = 0;
    
    for (const text of reflectionTexts) {
      let score = 50; // Base score for any reflection
      
      // Length bonus (50-200 chars optimal)
      if (text.length >= 50 && text.length <= 200) score += 20;
      else if (text.length > 200) score += 15;
      else if (text.length > 20) score += 10;
      
      // Depth markers
      if (text.includes('because') || text.includes('realize')) score += 10;
      if (text.includes('next') || text.includes('will')) score += 10;
      if (text.includes('?')) score += 5; // Questions show thinking
      
      totalScore += Math.min(100, score);
    }
    
    return Math.round(totalScore / reflectionTexts.length);
  } else {
    // Server-side analysis would go here
    // For now, return moderate score
    return 70;
  }
}

export function calculateSyncScore(
  rhythmData: any,
  actualSessions: SessionData[],
  optimalWindows: any[]
): number {
  if (actualSessions.length < 5) return 50; // Baseline
  
  // Calculate how many sessions fall within optimal windows
  let alignedSessions = 0;
  
  for (const session of actualSessions) {
    const sessionHour = new Date(session.startTime).getHours();
    const sessionDay = new Date(session.startTime).getDay();
    
    const isAligned = optimalWindows.some(window => 
      window.dayOfWeek === sessionDay &&
      sessionHour >= window.startHour &&
      sessionHour <= window.endHour
    );
    
    if (isAligned) alignedSessions++;
  }
  
  const alignmentRate = actualSessions.length > 0 ? 
    alignedSessions / actualSessions.length : 0;
  
  return Math.round(alignmentRate * 100);
}

export function identifyOptimalWindows(
  heatmapData: any[][],
  minSessions: number = 3,
  performanceThreshold: number = 70
): any[] {
  const windows: any[] = [];
  
  for (let day = 0; day < 7; day++) {
    const dayData = heatmapData[day] || [];
    
    for (const cell of dayData) {
      if (cell.sessionCount >= minSessions && cell.performance >= performanceThreshold) {
        // Check if this extends an existing window
        const existingWindow = windows.find(w => 
          w.dayOfWeek === day &&
          w.endHour === cell.hour - 1
        );
        
        if (existingWindow) {
          existingWindow.endHour = cell.hour;
          existingWindow.strength = Math.max(existingWindow.strength, cell.performance);
        } else {
          windows.push({
            dayOfWeek: day,
            startHour: cell.hour,
            endHour: cell.hour,
            strength: cell.performance,
            isPrimeLocked: false
          });
        }
      }
    }
  }
  
  // Sort by strength
  windows.sort((a, b) => b.strength - a.strength);
  
  return windows;
}