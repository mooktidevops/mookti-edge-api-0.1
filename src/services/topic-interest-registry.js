"use strict";
/**
 * Topic Interest Registry
 * Tracks topics that users are interested in but for which we lack content
 * Used to identify content gaps and guide curriculum development
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.topicRegistry = exports.TopicInterestRegistry = void 0;
const kv_1 = require("@vercel/kv");
class TopicInterestRegistry {
    REGISTRY_KEY = 'topic-interest-registry';
    REPORT_KEY = 'content-gap-reports';
    BATCH_SIZE = 100;
    /**
     * Log a topic that was queried but had no matching content
     */
    async logMissingTopic(interest) {
        try {
            // Get current registry
            const registry = await this.getRegistry();
            // Normalize the query for grouping
            const normalizedTopic = this.normalizeQuery(interest.query);
            // Add to registry
            const entry = {
                ...interest,
                normalizedTopic,
                timestamp: Date.now()
            };
            registry.push(entry);
            // Keep only recent entries (last 30 days)
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const recentRegistry = registry.filter(e => e.timestamp > thirtyDaysAgo);
            // Save back to KV
            await kv_1.kv.set(this.REGISTRY_KEY, recentRegistry, {
                ex: 60 * 60 * 24 * 30 // 30 days TTL
            });
            // Update frequency counts
            await this.updateFrequencyCount(normalizedTopic);
            // Check if we should generate a report
            if (recentRegistry.length % this.BATCH_SIZE === 0) {
                await this.generateReport();
            }
        }
        catch (error) {
            console.error('Error logging topic interest:', error);
            // Don't throw - this is a non-critical feature
        }
    }
    /**
     * Get the current registry of missing topics
     */
    async getRegistry() {
        try {
            const registry = await kv_1.kv.get(this.REGISTRY_KEY);
            return registry || [];
        }
        catch {
            return [];
        }
    }
    /**
     * Normalize query for grouping similar topics
     */
    normalizeQuery(query) {
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .split(' ')
            .slice(0, 5) // Take first 5 words as topic signature
            .join(' ');
    }
    /**
     * Update frequency count for a topic
     */
    async updateFrequencyCount(topic) {
        const countKey = `topic-frequency:${topic}`;
        await kv_1.kv.incr(countKey);
    }
    /**
     * Generate a content gap report
     */
    async generateReport() {
        const registry = await this.getRegistry();
        // Group by normalized topic
        const topicGroups = new Map();
        const userCounts = new Map();
        const namespaceGaps = new Map();
        registry.forEach(entry => {
            const topic = entry.normalizedTopic;
            // Group entries
            if (!topicGroups.has(topic)) {
                topicGroups.set(topic, []);
                userCounts.set(topic, new Set());
            }
            topicGroups.get(topic).push(entry);
            // Track unique users
            if (entry.userId) {
                userCounts.get(topic).add(entry.userId);
            }
            // Track namespace gaps
            const namespace = entry.namespace || 'unknown';
            namespaceGaps.set(namespace, (namespaceGaps.get(namespace) || 0) + 1);
        });
        // Sort topics by frequency
        const sortedTopics = Array.from(topicGroups.entries())
            .map(([topic, entries]) => ({
            topic,
            count: entries.length,
            users: userCounts.get(topic)?.size || 0,
            examples: entries.slice(0, 3).map(e => e.query)
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // Top 20 missing topics
        // Generate recommendations
        const recommendations = this.generateRecommendations(sortedTopics, namespaceGaps);
        const report = {
            period: `Last 30 days (${new Date().toLocaleDateString()})`,
            topMissingTopics: sortedTopics,
            namespaceGaps: Object.fromEntries(namespaceGaps),
            recommendations
        };
        // Save report
        await this.saveReport(report);
        return report;
    }
    /**
     * Generate content recommendations based on gaps
     */
    generateRecommendations(topics, namespaceGaps) {
        const recommendations = [];
        // High frequency topics
        const highFrequency = topics.filter(t => t.count > 10);
        if (highFrequency.length > 0) {
            recommendations.push(`Priority: Create content for ${highFrequency.length} high-frequency topics (${highFrequency[0].topic}, etc.)`);
        }
        // Namespace-specific gaps
        const gapArray = Array.from(namespaceGaps.entries()).sort((a, b) => b[1] - a[1]);
        if (gapArray[0]) {
            recommendations.push(`Expand content in '${gapArray[0][0]}' namespace (${gapArray[0][1]} gaps)`);
        }
        // Emerging topics (recent high velocity)
        const recentTopics = topics.filter(t => t.count > 5).slice(0, 5);
        if (recentTopics.length > 0) {
            recommendations.push(`Consider creating quick resources for emerging topics: ${recentTopics.map(t => t.topic).join(', ')}`);
        }
        return recommendations;
    }
    /**
     * Save report to KV for dashboard access
     */
    async saveReport(report) {
        // Get existing reports
        const reports = await kv_1.kv.get(this.REPORT_KEY) || [];
        // Add new report
        reports.unshift(report);
        // Keep only last 12 reports
        const recentReports = reports.slice(0, 12);
        // Save back
        await kv_1.kv.set(this.REPORT_KEY, recentReports, {
            ex: 60 * 60 * 24 * 90 // 90 days TTL
        });
    }
    /**
     * Get the latest content gap report
     */
    async getLatestReport() {
        const reports = await kv_1.kv.get(this.REPORT_KEY) || [];
        return reports[0] || null;
    }
    /**
     * Get all reports for dashboard
     */
    async getAllReports() {
        return await kv_1.kv.get(this.REPORT_KEY) || [];
    }
    /**
     * Check if a topic has been frequently requested
     */
    async isHighDemandTopic(topic) {
        const normalized = this.normalizeQuery(topic);
        const countKey = `topic-frequency:${normalized}`;
        const count = await kv_1.kv.get(countKey) || 0;
        return count > 5; // More than 5 requests
    }
}
exports.TopicInterestRegistry = TopicInterestRegistry;
// Export singleton instance
exports.topicRegistry = new TopicInterestRegistry();
