"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const growth_compass_storage_1 = __importDefault(require("../../lib/storage/growth-compass-storage"));
const calculations_1 = require("../../lib/growth-compass/calculations");
exports.runtime = 'edge';
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = searchParams.get('limit');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (!userId) {
            return server_1.NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }
        const sessions = await growth_compass_storage_1.default.getSessions(userId, limit ? parseInt(limit) : undefined, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        return server_1.NextResponse.json(sessions);
    }
    catch (error) {
        console.error('Error fetching sessions:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { userId, ...sessionData } = body;
        if (!userId) {
            return server_1.NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }
        // Validate required session fields
        if (!sessionData.startTime || !sessionData.endTime || !sessionData.type) {
            return server_1.NextResponse.json({ error: 'startTime, endTime, and type are required' }, { status: 400 });
        }
        // Calculate focus duration if not provided
        if (!sessionData.focusDuration) {
            const start = new Date(sessionData.startTime);
            const end = new Date(sessionData.endTime);
            sessionData.focusDuration = Math.round((end.getTime() - start.getTime()) / 60000);
        }
        // Set default quality if not provided
        if (!sessionData.quality) {
            sessionData.quality = 70; // Default neutral quality
        }
        // Add the session
        const session = await growth_compass_storage_1.default.addSession(userId, sessionData);
        // Recalculate Growth Velocity after adding session
        const data = await growth_compass_storage_1.default.getGrowthCompassData(userId);
        if (data) {
            const sessions = await growth_compass_storage_1.default.getSessions(userId, 100);
            const recoveryActivities = await growth_compass_storage_1.default.getRecoveryActivities(userId);
            // Calculate new velocity based on recent data
            const newVelocity = (0, calculations_1.calculateGrowthVelocity)(data.growthVelocity.components, data.currentSeason);
            // Determine trend
            const oldScore = data.growthVelocity.score;
            const trend = newVelocity > oldScore + 5 ? 'rising' :
                newVelocity < oldScore - 5 ? 'declining' : 'steady';
            // Update Growth Velocity
            await growth_compass_storage_1.default.updateGrowthCompassData(userId, {
                growthVelocity: {
                    score: newVelocity,
                    trend,
                    components: data.growthVelocity.components,
                    lastUpdated: new Date()
                }
            });
        }
        return server_1.NextResponse.json({
            session,
            message: 'Session added successfully'
        });
    }
    catch (error) {
        console.error('Error adding session:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
