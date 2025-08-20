import { PlanTier, UserEntitlements } from '../types/ellen/entitlements';
import planDefaults from './plans.default.json';
import { redisMonitor } from '../monitoring/redis-monitor';

export class EntitlementsManager {
  private static instance: EntitlementsManager;
  private plans: Map<string, PlanTier> = new Map();
  private kv: any;

  private constructor() {
    this.loadPlans();
  }

  public static getInstance(): EntitlementsManager {
    if (!EntitlementsManager.instance) {
      EntitlementsManager.instance = new EntitlementsManager();
    }
    return EntitlementsManager.instance;
  }

  private async getKV() {
    if (!this.kv) {
      const { kv } = await import('@vercel/kv');
      // Wrap KV with monitoring
      this.kv = redisMonitor.wrapKV(kv);
    }
    return this.kv;
  }

  private loadPlans(): void {
    // Load default plans
    const defaultPlans: PlanTier[] = [
      {
        name: 'free',
        display_name: 'Free',
        features: {
          uploads_enabled: false,
          upload_size_limit_mb: 0,
          daily_upload_limit: 0,
          upload_total_storage_gb: 0,
          frontier_models: false,
          model_picker: false,
          advanced_tools: [],
          socratic_depth: 1,
          revision_scheduler: false,
          concept_maps: false,
          worked_examples: true,
          peer_instruction: false,
        },
        rate_limits: {
          requests_per_minute: 10,
          requests_per_hour: 100,
          tokens_per_day: 50000,
          uploads_per_day: 0,
        },
        model_access: {
          default_tier: 'S',
          available_tiers: ['S'],
          escalation_allowed: false,
        },
      },
      {
        name: 'basic',
        display_name: 'Basic',
        features: {
          uploads_enabled: true,
          upload_size_limit_mb: 10,
          daily_upload_limit: 5,
          upload_total_storage_gb: 1,
          frontier_models: false,
          model_picker: false,
          advanced_tools: ['revision_scheduler'],
          socratic_depth: 2,
          revision_scheduler: true,
          concept_maps: true,
          worked_examples: true,
          peer_instruction: false,
        },
        rate_limits: {
          requests_per_minute: 30,
          requests_per_hour: 500,
          tokens_per_day: 200000,
          uploads_per_day: 5,
        },
        model_access: {
          default_tier: 'S',
          available_tiers: ['S', 'M'],
          escalation_allowed: true,
        },
      },
      {
        name: 'pro',
        display_name: 'Pro',
        features: {
          uploads_enabled: true,
          upload_size_limit_mb: 50,
          daily_upload_limit: 20,
          upload_total_storage_gb: 10,
          frontier_models: true,
          model_picker: true,
          advanced_tools: ['revision_scheduler', 'peer_instruction', 'calibration'],
          socratic_depth: 3,
          revision_scheduler: true,
          concept_maps: true,
          worked_examples: true,
          peer_instruction: true,
        },
        rate_limits: {
          requests_per_minute: 60,
          requests_per_hour: 1000,
          tokens_per_day: 1000000,
          uploads_per_day: 20,
        },
        model_access: {
          default_tier: 'M',
          available_tiers: ['S', 'M', 'L', 'F'],
          escalation_allowed: true,
        },
      },
      {
        name: 'enterprise',
        display_name: 'Enterprise',
        features: {
          uploads_enabled: true,
          upload_size_limit_mb: 200,
          daily_upload_limit: 100,
          upload_total_storage_gb: 100,
          frontier_models: true,
          model_picker: true,
          advanced_tools: ['all'],
          socratic_depth: 5,
          revision_scheduler: true,
          concept_maps: true,
          worked_examples: true,
          peer_instruction: true,
        },
        rate_limits: {
          requests_per_minute: 200,
          requests_per_hour: 5000,
          tokens_per_day: 10000000,
          uploads_per_day: 100,
        },
        model_access: {
          default_tier: 'L',
          available_tiers: ['S', 'M', 'L', 'F'],
          escalation_allowed: true,
        },
      },
    ];

    defaultPlans.forEach(plan => {
      this.plans.set(plan.name, plan);
    });
  }

  public async getUserEntitlements(userId: string): Promise<UserEntitlements> {
    const kv = await this.getKV();
    
    // Get user's plan from database
    const userPlanKey = `user_plan_${userId}`;
    const userPlan = await kv.get(userPlanKey) || 'free';
    
    // Get plan details
    const plan = this.plans.get(userPlan) || this.plans.get('free')!;
    
    // Get current usage
    const usageKey = `usage_${userId}_${new Date().toISOString().split('T')[0]}`;
    const usage = await kv.get(usageKey) || {
      requests_today: 0,
      tokens_today: 0,
      uploads_today: 0,
      storage_used_mb: 0,
    };

    // Check for any overrides
    const overridesKey = `overrides_${userId}`;
    const overrides = await kv.get(overridesKey);

    return {
      user_id: userId,
      plan,
      usage,
      overrides,
    };
  }

  public async logUsage(
    userId: string, 
    type: 'search' | 'upload' | 'request' | 'tokens',
    amount: number = 1
  ): Promise<void> {
    const kv = await this.getKV();
    const usageKey = `usage_${userId}_${new Date().toISOString().split('T')[0]}`;
    
    const usage = await kv.get(usageKey) || {
      requests_today: 0,
      tokens_today: 0,
      uploads_today: 0,
      storage_used_mb: 0,
    };

    switch (type) {
      case 'request':
      case 'search':
        usage.requests_today += amount;
        break;
      case 'upload':
        usage.uploads_today += amount;
        break;
      case 'tokens':
        usage.tokens_today += amount;
        break;
    }

    await kv.set(usageKey, usage, { ex: 86400 }); // Expire after 24 hours
  }

  public async checkRateLimit(userId: string, type: 'minute' | 'hour'): Promise<boolean> {
    const entitlements = await this.getUserEntitlements(userId);
    const kv = await this.getKV();
    
    const now = Date.now();
    const window = type === 'minute' ? 60000 : 3600000;
    const limit = type === 'minute' 
      ? entitlements.plan.rate_limits.requests_per_minute
      : entitlements.plan.rate_limits.requests_per_hour;
    
    const key = `rate_${userId}_${type}_${Math.floor(now / window)}`;
    const count = await kv.incr(key);
    
    if (count === 1) {
      await kv.expire(key, Math.ceil(window / 1000));
    }
    
    return count <= limit;
  }

  public async upgradeUser(userId: string, newPlan: 'free' | 'basic' | 'pro' | 'enterprise'): Promise<void> {
    const kv = await this.getKV();
    const userPlanKey = `user_plan_${userId}`;
    await kv.set(userPlanKey, newPlan);
    
    // Log the upgrade
    console.log(`User ${userId} upgraded to ${newPlan} at ${new Date().toISOString()}`);
  }
}