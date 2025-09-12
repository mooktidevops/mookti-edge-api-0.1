"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.PUT = PUT;
const server_1 = require("next/server");
const growth_compass_storage_1 = __importDefault(require("../../lib/storage/growth-compass-storage"));
const data_thresholds_1 = require("../../lib/growth-compass/data-thresholds");
exports.runtime = 'edge';
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) {
            return server_1.NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }
        // Get user's Growth Compass data
        const data = await growth_compass_storage_1.default.getGrowthCompassData(userId);
        if (!data) {
            return server_1.NextResponse.json({ error: 'Data not found' }, { status: 404 });
        }
        // Check data sufficiency
        const stats = data.dataCollection || {
            weeksActive: 0,
            totalSessions: 0,
            totalDaysActive: 0
        };
        // Create sessions per window map for sufficiency check
        const sessionsPerWindow = new Map();
        data.rhythmData.heatmapData.forEach((dayData, day) => {
            dayData.forEach(cell => {
                const key = `${day}-${cell.hour}`;
                sessionsPerWindow.set(key, cell.sessionCount);
            });
        });
        const sufficiency = (0, data_thresholds_1.checkDataSufficiency)(stats.weeksActive, stats.totalSessions, sessionsPerWindow, stats.totalDaysActive);
        // Return data with sufficiency information
        return server_1.NextResponse.json({
            data,
            sufficiency,
            recommendations: {
                showRhythmPatterns: sufficiency.recommendationsAllowed.rhythmPatterns,
                showPowerPatterns: sufficiency.recommendationsAllowed.powerPatterns,
                showSyncScore: sufficiency.recommendationsAllowed.syncScore,
                showSeasonSuggestions: sufficiency.recommendationsAllowed.seasonSuggestions
            }
        });
    }
    catch (error) {
        console.error('Error fetching Growth Compass data:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function PUT(request) {
    try {
        const body = await request.json();
        const { userId, ...updates } = body;
        if (!userId) {
            return server_1.NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }
        const updatedData = await growth_compass_storage_1.default.updateGrowthCompassData(userId, updates);
        return server_1.NextResponse.json(updatedData);
    }
    catch (error) {
        console.error('Error updating Growth Compass data:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
