import { NextRequest, NextResponse } from 'next/server';
import { topicRegistry } from '../../src/services/topic-interest-registry';

export const runtime = 'edge';

/**
 * Content Gap Reports API
 * Provides access to topic interest data and content gap analysis
 */

export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization (you should implement proper auth)
    const authHeader = request.headers.get('authorization');
    // TODO: Implement proper admin auth check
    // if (!isAdminAuthorized(authHeader)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    // Get report type from query params
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'latest';
    
    let data;
    
    switch (reportType) {
      case 'latest':
        data = await topicRegistry.getLatestReport();
        break;
        
      case 'all':
        data = await topicRegistry.getAllReports();
        break;
        
      case 'generate':
        // Generate a new report
        data = await topicRegistry.generateReport();
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid report type. Use: latest, all, or generate' },
          { status: 400 }
        );
    }
    
    if (!data) {
      return NextResponse.json(
        { 
          message: 'No reports available yet',
          hint: 'Reports are generated after 100 missing topic queries'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      reportType,
      data
    });
    
  } catch (error) {
    console.error('Error fetching content gap report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content gap report' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually log a content gap
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    // TODO: Implement proper admin auth check
    
    const body = await request.json() as any;
    
    if (!body.query || !body.queryType) {
      return NextResponse.json(
        { error: 'Missing required fields: query, queryType' },
        { status: 400 }
      );
    }
    
    await topicRegistry.logMissingTopic({
      query: body.query,
      userId: body.userId,
      sessionId: body.sessionId,
      timestamp: Date.now(),
      queryType: body.queryType,
      namespace: body.namespace
    });
    
    return NextResponse.json({
      success: true,
      message: 'Content gap logged successfully'
    });
    
  } catch (error) {
    console.error('Error logging content gap:', error);
    return NextResponse.json(
      { error: 'Failed to log content gap' },
      { status: 500 }
    );
  }
}