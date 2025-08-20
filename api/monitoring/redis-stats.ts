// API endpoint to monitor Redis usage
// GET /api/monitoring/redis-stats

import { redisMonitor } from '../../src/monitoring/redis-monitor';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler(req: Request) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Get authorization header for basic protection
    const authHeader = req.headers.get('Authorization');
    
    // Simple bearer token check (you can make this more secure)
    // For beta, you can use a simple token
    const MONITORING_TOKEN = process.env.MONITORING_TOKEN || 'beta-monitoring-2024';
    
    if (!authHeader || !authHeader.includes(MONITORING_TOKEN)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get usage stats
    const stats = await redisMonitor.getUsageStats();
    
    // Add alerts if approaching limits
    const alerts = [];
    
    if (stats.usage_percentage > 80) {
      alerts.push({
        level: 'warning',
        message: `Redis usage at ${stats.usage_percentage}% of daily limit`,
        action: 'Consider upgrading to Pay-as-you-go tier',
      });
    }
    
    if (stats.usage_percentage > 95) {
      alerts.push({
        level: 'critical',
        message: 'Redis usage critical - will hit limit soon',
        action: 'Upgrade immediately to avoid service interruption',
      });
    }
    
    if (stats.storage_used_mb > 200) {
      alerts.push({
        level: 'warning',
        message: `Storage usage at ${stats.storage_used_mb}MB of 256MB limit`,
        action: 'Monitor document uploads closely',
      });
    }
    
    const response = {
      stats,
      alerts,
      timestamp: new Date().toISOString(),
      recommendations: getRecommendations(stats),
    };
    
    // Add usage headers for easy monitoring
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Redis-Commands-Today': stats.commands_today.toString(),
          'X-Redis-Usage-Percent': stats.usage_percentage.toString(),
          'X-Redis-Storage-MB': stats.storage_used_mb.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('Monitoring error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to get monitoring stats',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function getRecommendations(stats: any): string[] {
  const recommendations = [];
  
  if (stats.usage_percentage < 10) {
    recommendations.push('Usage is low - Free tier is sufficient');
  } else if (stats.usage_percentage < 50) {
    recommendations.push('Usage is moderate - Continue monitoring');
  } else if (stats.usage_percentage < 80) {
    recommendations.push('Usage is growing - Prepare to upgrade if growth continues');
  } else {
    recommendations.push('High usage detected - Upgrade to Pay-as-you-go recommended');
    recommendations.push('Set up Upstash alerts in dashboard');
  }
  
  // Storage recommendations
  if (stats.storage_used_mb > 100) {
    recommendations.push('Consider implementing document cleanup for old uploads');
  }
  
  return recommendations;
}