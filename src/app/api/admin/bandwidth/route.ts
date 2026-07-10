import { NextResponse } from 'next/server'
import { getBandwidthStats, maybeNotify } from '@/lib/bandwidthService'

/**
 * GET /api/admin/bandwidth
 * Returns the 30-day outbound-traffic rolling window for the admin dashboard:
 *   { used30d, limit, percent, status, today, dailyBreakdown: [{ date, bytes }] }
 * Also fires a deduped (once/day/severity) alert when the warn/critical
 * threshold is crossed.
 */
export async function GET() {
  try {
    const stats = await getBandwidthStats()
    // Fire-and-forget: alerting must never delay/break the response.
    void maybeNotify(stats)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('[Bandwidth API] Failed:', error)
    return NextResponse.json(
      { error: 'Failed to load bandwidth stats' },
      { status: 500 }
    )
  }
}
