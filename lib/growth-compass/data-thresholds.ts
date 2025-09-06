/**
 * Growth Compass Data Thresholds and Sufficiency Checks
 * Ensures recommendations only appear when we have sufficient data
 */

export interface DataSufficiency {
  hasMinimumData: boolean;
  confidence: number; // 0-1
  missingDataTypes: string[];
  recommendationsAllowed: {
    rhythmPatterns: boolean;
    powerPatterns: boolean;
    syncScore: boolean;
    seasonSuggestions: boolean;
  };
  timeline: {
    phase: 'collecting' | 'emerging' | 'confident';
    weeksActive: number;
    sessionsLogged: number;
  };
}

// Minimum thresholds before making recommendations
export const DATA_THRESHOLDS = {
  // Rhythm pattern discovery
  rhythm: {
    minSessions: 20,
    minWeeks: 2,
    minSessionsPerWindow: 3,
    confidenceThreshold: 0.7
  },
  
  // Power pattern experiments
  powerPatterns: {
    minWeeks: 4,
    minSessionsBeforeExperiment: 30,
    minTrialsForPattern: 10,
    confidenceThreshold: 0.75
  },
  
  // Sync score accuracy
  syncScore: {
    minSessions: 10,
    minDaysActive: 7,
    baselineDefault: 50 // Start at neutral
  },
  
  // Season suggestions
  seasons: {
    minWeeks: 3,
    minSessionsForSuggestion: 25
  },
  
  // Component scoring minimums
  components: {
    goalAlignment: {
      minTasks: 5,
      minDays: 3
    },
    balanceIndex: {
      minSessions: 10,
      minHoursLogged: 10
    },
    depthScore: {
      minFocusSessions: 5
    },
    reflectionQuality: {
      minReflections: 3
    }
  }
};

/**
 * Check if we have sufficient data for various recommendations
 */
export function checkDataSufficiency(
  weeksActive: number,
  totalSessions: number,
  sessionsPerWindow: Map<string, number>,
  daysActive: number
): DataSufficiency {
  const missingDataTypes: string[] = [];
  
  // Determine timeline phase
  let phase: 'collecting' | 'emerging' | 'confident';
  if (weeksActive < 2) {
    phase = 'collecting';
  } else if (weeksActive < 4) {
    phase = 'emerging';
  } else {
    phase = 'confident';
  }
  
  // Check rhythm patterns
  const rhythmReady = 
    totalSessions >= DATA_THRESHOLDS.rhythm.minSessions &&
    weeksActive >= DATA_THRESHOLDS.rhythm.minWeeks &&
    Array.from(sessionsPerWindow.values()).some(
      count => count >= DATA_THRESHOLDS.rhythm.minSessionsPerWindow
    );
  
  if (!rhythmReady) {
    missingDataTypes.push('rhythm_patterns');
  }
  
  // Check power patterns
  const powerPatternsReady = 
    weeksActive >= DATA_THRESHOLDS.powerPatterns.minWeeks &&
    totalSessions >= DATA_THRESHOLDS.powerPatterns.minSessionsBeforeExperiment;
  
  if (!powerPatternsReady) {
    missingDataTypes.push('power_patterns');
  }
  
  // Check sync score
  const syncScoreReady = 
    totalSessions >= DATA_THRESHOLDS.syncScore.minSessions &&
    daysActive >= DATA_THRESHOLDS.syncScore.minDaysActive;
  
  if (!syncScoreReady) {
    missingDataTypes.push('sync_score');
  }
  
  // Check season suggestions
  const seasonSuggestionsReady = 
    weeksActive >= DATA_THRESHOLDS.seasons.minWeeks &&
    totalSessions >= DATA_THRESHOLDS.seasons.minSessionsForSuggestion;
  
  if (!seasonSuggestionsReady) {
    missingDataTypes.push('season_suggestions');
  }
  
  // Calculate overall confidence
  const confidence = calculateConfidence(weeksActive, totalSessions, daysActive);
  
  return {
    hasMinimumData: totalSessions >= 5 && daysActive >= 2,
    confidence,
    missingDataTypes,
    recommendationsAllowed: {
      rhythmPatterns: rhythmReady,
      powerPatterns: powerPatternsReady,
      syncScore: syncScoreReady,
      seasonSuggestions: seasonSuggestionsReady
    },
    timeline: {
      phase,
      weeksActive,
      sessionsLogged: totalSessions
    }
  };
}

/**
 * Calculate confidence score based on data availability
 */
function calculateConfidence(
  weeksActive: number,
  totalSessions: number,
  daysActive: number
): number {
  // Weight different factors
  const weekScore = Math.min(1, weeksActive / 8);
  const sessionScore = Math.min(1, totalSessions / 100);
  const dayScore = Math.min(1, daysActive / 30);
  
  // Weighted average
  return (weekScore * 0.4) + (sessionScore * 0.35) + (dayScore * 0.25);
}

/**
 * Get appropriate messages based on data sufficiency
 */
export function getDataSufficiencyMessages(sufficiency: DataSufficiency): {
  primary: string;
  details: string[];
  recommendations: string[];
} {
  const messages = {
    primary: '',
    details: [] as string[],
    recommendations: [] as string[]
  };
  
  switch (sufficiency.timeline.phase) {
    case 'collecting':
      messages.primary = 'Building your baseline (Week 1-2)';
      messages.details.push('Ellen is learning your patterns');
      messages.details.push(`${sufficiency.sessionsLogged} sessions logged so far`);
      messages.recommendations.push('Keep logging sessions to discover your rhythm');
      break;
      
    case 'emerging':
      messages.primary = 'Patterns emerging (Week 3-4)';
      messages.details.push('Initial insights available');
      
      if (sufficiency.recommendationsAllowed.rhythmPatterns) {
        messages.recommendations.push('View your emerging optimal windows');
      }
      if (!sufficiency.recommendationsAllowed.powerPatterns) {
        messages.recommendations.push(`${4 - sufficiency.timeline.weeksActive} more weeks until Power Patterns`);
      }
      break;
      
    case 'confident':
      messages.primary = 'Full insights available';
      messages.details.push(`Confidence: ${Math.round(sufficiency.confidence * 100)}%`);
      
      if (sufficiency.recommendationsAllowed.powerPatterns) {
        messages.recommendations.push('Power Pattern experiments active');
      }
      if (sufficiency.recommendationsAllowed.seasonSuggestions) {
        messages.recommendations.push('Season recommendations available');
      }
      break;
  }
  
  // Add missing data notices
  if (sufficiency.missingDataTypes.includes('rhythm_patterns')) {
    messages.details.push('Need more sessions at consistent times for rhythm patterns');
  }
  if (sufficiency.missingDataTypes.includes('sync_score')) {
    messages.details.push('Building sync baseline...');
  }
  
  return messages;
}

/**
 * Determine if a specific feature should be shown
 */
export function shouldShowFeature(
  feature: 'primeSlots' | 'windowSwap' | 'powerPatterns' | 'resyncWorkflow',
  sufficiency: DataSufficiency
): boolean {
  switch (feature) {
    case 'primeSlots':
      return sufficiency.timeline.weeksActive >= 4 && 
             sufficiency.recommendationsAllowed.rhythmPatterns;
      
    case 'windowSwap':
      return sufficiency.timeline.weeksActive >= 3 && 
             sufficiency.recommendationsAllowed.rhythmPatterns;
      
    case 'powerPatterns':
      return sufficiency.recommendationsAllowed.powerPatterns;
      
    case 'resyncWorkflow':
      return sufficiency.recommendationsAllowed.syncScore;
      
    default:
      return false;
  }
}