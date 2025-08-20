// Redis Usage Monitoring for Upstash
// Tracks command usage to prevent hitting limits during beta

interface RedisUsageStats {
  commands_today: number;
  storage_used_mb: number;
  daily_limit: number;
  usage_percentage: number;
  tier: 'free' | 'pay-as-you-go' | 'pro';
}

export class RedisMonitor {
  private static instance: RedisMonitor;
  private commandCount: number = 0;
  private lastReset: string;
  
  private constructor() {
    this.lastReset = new Date().toISOString().split('T')[0];
  }
  
  public static getInstance(): RedisMonitor {
    if (!RedisMonitor.instance) {
      RedisMonitor.instance = new RedisMonitor();
    }
    return RedisMonitor.instance;
  }
  
  // Track each Redis command
  public incrementCommand(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastReset) {
      this.commandCount = 0;
      this.lastReset = today;
    }
    this.commandCount++;
    
    // Log warning if approaching limit
    if (this.commandCount > 8000) {
      console.warn(`⚠️ Redis commands today: ${this.commandCount} - Approaching free tier limit (10,000)`);
    }
  }
  
  // Get current usage stats
  public async getUsageStats(): Promise<RedisUsageStats> {
    try {
      // Query Upstash for actual stats
      const response = await fetch('https://integral-hen-46399.upstash.io/info', {
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_READ_ONLY_TOKEN}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Redis stats');
      }
      
      const info = await response.text();
      
      // Parse used_memory from INFO response
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const usedBytes = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      const usedMB = Math.round(usedBytes / 1024 / 1024);
      
      return {
        commands_today: this.commandCount,
        storage_used_mb: usedMB,
        daily_limit: 10000, // Free tier limit
        usage_percentage: Math.round((this.commandCount / 10000) * 100),
        tier: 'free',
      };
    } catch (error) {
      console.error('Failed to get Redis usage stats:', error);
      
      // Return local stats as fallback
      return {
        commands_today: this.commandCount,
        storage_used_mb: 0,
        daily_limit: 10000,
        usage_percentage: Math.round((this.commandCount / 10000) * 100),
        tier: 'free',
      };
    }
  }
  
  // Middleware to track all KV operations
  public wrapKV(kv: any): any {
    const monitor = this;
    
    return new Proxy(kv, {
      get(target, prop) {
        const original = target[prop];
        
        // Wrap methods that make Redis commands
        if (typeof original === 'function') {
          return function(...args: any[]) {
            monitor.incrementCommand();
            return original.apply(target, args);
          };
        }
        
        return original;
      },
    });
  }
}

// Export singleton instance
export const redisMonitor = RedisMonitor.getInstance();