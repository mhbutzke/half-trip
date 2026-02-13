import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health Check Endpoint
 *
 * Returns application health status including:
 * - Overall status (healthy/degraded/unhealthy)
 * - Database connectivity
 * - Timestamp
 *
 * Usage:
 * - Uptime monitoring (UptimeRobot, Pingdom, etc.)
 * - Load balancer health checks
 * - Internal monitoring dashboards
 *
 * Status Codes:
 * - 200: Healthy
 * - 503: Unhealthy/Degraded
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const supabase = await createClient();
    const { error: dbError } = await supabase.from('users').select('id').limit(1).single();

    const databaseHealthy = !dbError || dbError.code === 'PGRST116'; // PGRST116 = no rows, but connection works

    // Determine overall status
    const status = databaseHealthy ? 'healthy' : 'degraded';
    const statusCode = status === 'healthy' ? 200 : 503;

    // Calculate response time
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        responseTime,
        checks: {
          database: databaseHealthy,
        },
      },
      { status: statusCode }
    );
  } catch {
    // Unexpected error - system is unhealthy
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime,
        checks: {
          database: false,
        },
      },
      { status: 503 }
    );
  }
}
