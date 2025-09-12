"use strict";
/**
 * Pattern Detection Service for Growth Compass
 * Analyzes user learning patterns and identifies success formulas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.patternDetector = exports.PatternDetector = void 0;
const kv_1 = require("@vercel/kv");
class PatternDetector {
    MIN_SESSIONS_FOR_PATTERN = 5;
    CONFIDENCE_THRESHOLD = 0.6;
    /**
     * Analyze session history to detect learning patterns
     */
    async detectPatterns(userId, sessions) {
        if (sessions.length < this.MIN_SESSIONS_FOR_PATTERN) {
            return [];
        }
        const patterns = [];
        // Run all pattern detectors
        const detectedPatterns = await Promise.all([
            this.detectTimeOfDayPattern(sessions),
            this.detectDurationPattern(sessions),
            this.detectConsistencyPattern(sessions),
            this.detectToolPreferencePattern(sessions),
            this.detectDepthPattern(sessions),
            this.detectRecoveryPattern(sessions),
            this.detectMultimodalPattern(sessions),
            this.detectFocusPattern(sessions),
            this.detectGrowthTrajectory(sessions)
        ]);
        // Filter out null patterns and those below confidence threshold
        const validPatterns = detectedPatterns
            .filter(p => p !== null && p.confidence >= this.CONFIDENCE_THRESHOLD);
        // Store patterns for the user
        await this.storePatterns(userId, validPatterns);
        return validPatterns;
    }
    /**
     * Detect time of day preferences
     */
    async detectTimeOfDayPattern(sessions) {
        const timeDistribution = new Map();
        sessions.forEach(session => {
            const hour = new Date(session.startTime).getHours();
            let period;
            if (hour >= 5 && hour < 9)
                period = 'early_morning';
            else if (hour >= 9 && hour < 12)
                period = 'morning';
            else if (hour >= 12 && hour < 14)
                period = 'midday';
            else if (hour >= 14 && hour < 17)
                period = 'afternoon';
            else if (hour >= 17 && hour < 20)
                period = 'evening';
            else if (hour >= 20 && hour < 23)
                period = 'night';
            else
                period = 'late_night';
            timeDistribution.set(period, (timeDistribution.get(period) || 0) + 1);
        });
        // Find dominant period
        let maxCount = 0;
        let dominantPeriod = '';
        timeDistribution.forEach((count, period) => {
            if (count > maxCount) {
                maxCount = count;
                dominantPeriod = period;
            }
        });
        const confidence = maxCount / sessions.length;
        if (confidence < 0.4)
            return null; // No clear pattern
        const periodNames = {
            early_morning: 'Early Bird',
            morning: 'Morning Learner',
            midday: 'Midday Focus',
            afternoon: 'Afternoon Scholar',
            evening: 'Evening Student',
            night: 'Night Owl',
            late_night: 'Midnight Oil'
        };
        return {
            id: `time_${dominantPeriod}`,
            type: 'time_of_day',
            name: periodNames[dominantPeriod] || 'Time Pattern',
            description: `You tend to learn best during ${dominantPeriod.replace('_', ' ')} hours`,
            confidence,
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: maxCount,
            impact: 'positive',
            recommendations: [
                `Schedule important learning sessions during ${dominantPeriod.replace('_', ' ')}`,
                'Protect this time from distractions',
                'Use other times for lighter review'
            ]
        };
    }
    /**
     * Detect session duration preferences
     */
    async detectDurationPattern(sessions) {
        const durations = sessions.map(s => Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000));
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const stdDev = Math.sqrt(durations.reduce((sq, n) => sq + Math.pow(n - avgDuration, 2), 0) / durations.length);
        let pattern;
        let recommendations;
        if (avgDuration < 20) {
            pattern = 'Micro-Learner';
            recommendations = [
                'Perfect for busy schedules',
                'Consider using spaced repetition',
                'Focus on one concept per session'
            ];
        }
        else if (avgDuration < 45) {
            pattern = 'Sprint Learner';
            recommendations = [
                'Ideal duration for focused attention',
                'Use Pomodoro technique',
                'Take short breaks between sprints'
            ];
        }
        else if (avgDuration < 90) {
            pattern = 'Deep Diver';
            recommendations = [
                'Great for complex topics',
                'Remember to take breaks',
                'Vary intensity within sessions'
            ];
        }
        else {
            pattern = 'Marathon Scholar';
            recommendations = [
                'Excellent endurance',
                'Ensure regular breaks',
                'Stay hydrated and move periodically'
            ];
        }
        const consistency = stdDev < avgDuration * 0.3 ? 0.8 : 0.6;
        return {
            id: `duration_${pattern.toLowerCase().replace(' ', '_')}`,
            type: 'duration',
            name: pattern,
            description: `Average session duration: ${Math.round(avgDuration)} minutes`,
            confidence: consistency,
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: sessions.length,
            impact: 'positive',
            recommendations
        };
    }
    /**
     * Detect consistency patterns
     */
    async detectConsistencyPattern(sessions) {
        // Sort sessions by date
        const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        // Calculate gaps between sessions
        const gaps = [];
        for (let i = 1; i < sortedSessions.length; i++) {
            const gap = new Date(sortedSessions[i].startTime).getTime() -
                new Date(sortedSessions[i - 1].startTime).getTime();
            gaps.push(gap / (1000 * 60 * 60 * 24)); // Convert to days
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const regularGaps = gaps.filter(g => Math.abs(g - avgGap) < 2).length;
        const consistency = regularGaps / gaps.length;
        let pattern;
        let impact;
        if (avgGap < 2 && consistency > 0.7) {
            pattern = 'Daily Warrior';
            impact = 'positive';
        }
        else if (avgGap < 4 && consistency > 0.6) {
            pattern = 'Regular Rhythm';
            impact = 'positive';
        }
        else if (avgGap < 7 && consistency > 0.5) {
            pattern = 'Weekly Warrior';
            impact = 'positive';
        }
        else if (consistency < 0.3) {
            pattern = 'Spontaneous Learner';
            impact = 'neutral';
        }
        else {
            pattern = 'Flexible Schedule';
            impact = 'neutral';
        }
        return {
            id: `consistency_${pattern.toLowerCase().replace(' ', '_')}`,
            type: 'consistency',
            name: pattern,
            description: `Average ${Math.round(avgGap)} days between sessions`,
            confidence: consistency,
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: sessions.length,
            impact,
            recommendations: pattern === 'Spontaneous Learner'
                ? ['Consider setting learning reminders', 'Small daily habits can help']
                : ['Keep up the great rhythm!', 'Your consistency is your superpower']
        };
    }
    /**
     * Detect tool usage preferences
     */
    async detectToolPreferencePattern(sessions) {
        const toolUsage = new Map();
        sessions.forEach(session => {
            session.toolsUsed?.forEach((tool) => {
                toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
            });
        });
        if (toolUsage.size === 0)
            return null;
        // Find most used tools
        const sortedTools = Array.from(toolUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        const topTool = sortedTools[0];
        const confidence = topTool[1] / sessions.length;
        const toolPatterns = {
            socratic_tool: 'Questioner',
            reflection_tool: 'Reflective Thinker',
            retrieval: 'Practice Champion',
            writing_coach: 'Writing Focused',
            plan_manager: 'Strategic Planner',
            note_assistant: 'Note Master',
            concept_mapper: 'Visual Thinker'
        };
        return {
            id: `tool_${topTool[0]}`,
            type: 'tool_preference',
            name: toolPatterns[topTool[0]] || 'Tool Specialist',
            description: `Frequently uses ${topTool[0].replace('_', ' ')}`,
            confidence,
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: topTool[1],
            impact: 'positive',
            recommendations: [
                `Continue leveraging ${topTool[0].replace('_', ' ')}`,
                'Try combining with other tools occasionally',
                'Your tool preference shows your learning style'
            ]
        };
    }
    /**
     * Detect learning depth patterns
     */
    async detectDepthPattern(sessions) {
        const depths = sessions.map(s => s.depthLevel || 0);
        const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
        let pattern;
        let confidence = 0.7;
        if (avgDepth < 2) {
            pattern = 'Explorer';
        }
        else if (avgDepth < 3.5) {
            pattern = 'Balanced Learner';
        }
        else {
            pattern = 'Deep Thinker';
        }
        return {
            id: `depth_${pattern.toLowerCase().replace(' ', '_')}`,
            type: 'depth_style',
            name: pattern,
            description: `Average depth level: ${avgDepth.toFixed(1)}/5`,
            confidence,
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: sessions.length,
            impact: 'positive',
            recommendations: pattern === 'Explorer'
                ? ['Try diving deeper into topics that interest you', 'Deep understanding takes time']
                : ['Your depth of learning is impressive', 'Remember to also explore broadly']
        };
    }
    /**
     * Detect recovery patterns after struggle
     */
    async detectRecoveryPattern(sessions) {
        // Look for sessions with low quality followed by improvement
        const recoveries = [];
        for (let i = 1; i < sessions.length; i++) {
            const prev = sessions[i - 1];
            const curr = sessions[i];
            if ((prev.qualityScore || prev.quality || 3) < 3 && (curr.qualityScore || curr.quality || 3) >= 3) {
                recoveries.push(1);
            }
        }
        if (recoveries.length === 0)
            return null;
        const recoveryRate = recoveries.length / sessions.length;
        return {
            id: 'recovery_resilient',
            type: 'recovery_style',
            name: 'Resilient Learner',
            description: 'Bounces back well from challenges',
            confidence: Math.min(recoveryRate * 2, 0.9),
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: recoveries.length,
            impact: 'positive',
            recommendations: [
                'Your resilience is a key strength',
                'Challenges are opportunities for growth',
                'Keep embracing difficult topics'
            ]
        };
    }
    /**
     * Detect multimodal learning patterns
     */
    async detectMultimodalPattern(sessions) {
        const uniqueTools = new Set();
        const uniqueTypes = new Set();
        sessions.forEach(session => {
            session.toolsUsed?.forEach((tool) => uniqueTools.add(tool));
            if (session.sessionType || session.type)
                uniqueTypes.add(session.sessionType || session.type);
        });
        const variety = (uniqueTools.size + uniqueTypes.size) / 2;
        if (variety < 3)
            return null;
        return {
            id: 'multimodal_learner',
            type: 'multimodal',
            name: 'Versatile Learner',
            description: `Uses ${uniqueTools.size} different tools across ${uniqueTypes.size} session types`,
            confidence: Math.min(variety / 5, 0.9),
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: sessions.length,
            impact: 'positive',
            recommendations: [
                'Your varied approach enhances learning',
                'Different tools for different goals',
                'Keep experimenting with new methods'
            ]
        };
    }
    /**
     * Detect focus patterns
     */
    async detectFocusPattern(sessions) {
        // Analyze topic switching within sessions
        const focusScores = sessions.map(s => {
            const topics = s.topics?.length || 1;
            return topics === 1 ? 1 : 1 / topics;
        });
        const avgFocus = focusScores.reduce((a, b) => a + b, 0) / focusScores.length;
        let pattern;
        if (avgFocus > 0.8) {
            pattern = 'Laser Focus';
        }
        else if (avgFocus > 0.5) {
            pattern = 'Balanced Focus';
        }
        else {
            pattern = 'Multitasker';
        }
        return {
            id: `focus_${pattern.toLowerCase().replace(' ', '_')}`,
            type: 'focus_pattern',
            name: pattern,
            description: `Focus score: ${(avgFocus * 100).toFixed(0)}%`,
            confidence: 0.7,
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: sessions.length,
            impact: 'positive',
            recommendations: pattern === 'Multitasker'
                ? ['Try single-topic sessions occasionally', 'Deep focus can enhance understanding']
                : ['Your focus is a strength', 'Single-topic mastery is powerful']
        };
    }
    /**
     * Detect growth trajectory
     */
    async detectGrowthTrajectory(sessions) {
        if (sessions.length < 10)
            return null;
        // Analyze quality scores over time
        const sortedSessions = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const firstHalf = sortedSessions.slice(0, Math.floor(sessions.length / 2));
        const secondHalf = sortedSessions.slice(Math.floor(sessions.length / 2));
        const avgFirst = firstHalf.reduce((sum, s) => sum + (s.qualityScore || s.quality || 3), 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum, s) => sum + (s.qualityScore || s.quality || 3), 0) / secondHalf.length;
        const improvement = ((avgSecond - avgFirst) / avgFirst) * 100;
        let pattern;
        let impact;
        if (improvement > 20) {
            pattern = 'Rapid Improver';
            impact = 'positive';
        }
        else if (improvement > 5) {
            pattern = 'Steady Climber';
            impact = 'positive';
        }
        else if (improvement > -5) {
            pattern = 'Consistent Performer';
            impact = 'positive';
        }
        else {
            pattern = 'Needs Support';
            impact = 'negative';
        }
        return {
            id: `growth_${pattern.toLowerCase().replace(' ', '_')}`,
            type: 'growth_trajectory',
            name: pattern,
            description: `${Math.abs(improvement).toFixed(0)}% ${improvement > 0 ? 'improvement' : 'change'} over time`,
            confidence: 0.75,
            firstDetected: new Date(),
            lastObserved: new Date(),
            frequency: sessions.length,
            impact,
            recommendations: pattern === 'Needs Support'
                ? ['Consider trying different approaches', 'Small wins build momentum', 'Reach out for help when stuck']
                : ['Your growth trajectory is impressive', 'Keep up the great work!']
        };
    }
    /**
     * Store detected patterns for a user
     */
    async storePatterns(userId, patterns) {
        const key = `patterns:${userId}`;
        const existingPatterns = await kv_1.kv.get(key) || [];
        // Merge with existing patterns, updating if already exists
        const patternMap = new Map();
        existingPatterns.forEach(p => patternMap.set(p.id, p));
        patterns.forEach(p => {
            const existing = patternMap.get(p.id);
            if (existing) {
                // Update existing pattern
                p.frequency = existing.frequency + 1;
                p.firstDetected = existing.firstDetected;
            }
            patternMap.set(p.id, p);
        });
        const mergedPatterns = Array.from(patternMap.values());
        await kv_1.kv.set(key, mergedPatterns, {
            ex: 60 * 60 * 24 * 90 // 90 days TTL
        });
    }
    /**
     * Get stored patterns for a user
     */
    async getUserPatterns(userId) {
        const patterns = await kv_1.kv.get(`patterns:${userId}`);
        return patterns || [];
    }
    /**
     * Convert patterns to PowerPatterns for Growth Compass
     */
    convertToPowerPatterns(patterns) {
        return patterns
            .filter(p => p.impact === 'positive' && p.confidence > 0.7)
            .map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            confidence: p.confidence * 100,
            validations: p.frequency,
            isAdopted: p.confidence > 0.8,
            discoveredDate: p.firstDetected,
            lastValidated: p.lastObserved
        }));
    }
    mapPatternTypeToCategory(type) {
        switch (type) {
            case 'time_of_day':
            case 'duration':
            case 'consistency':
                return 'time';
            case 'tool_preference':
            case 'multimodal':
            case 'depth_style':
                return 'method';
            case 'collaboration':
                return 'social';
            case 'recovery_style':
            case 'focus_pattern':
            case 'growth_trajectory':
            default:
                return 'meta';
        }
    }
}
exports.PatternDetector = PatternDetector;
// Export singleton instance
exports.patternDetector = new PatternDetector();
