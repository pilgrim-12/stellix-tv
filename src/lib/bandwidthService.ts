import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  increment,
} from 'firebase/firestore'
import { db } from './firebase'

/**
 * Outbound bandwidth (Vercel "Fast Origin Transfer") accounting.
 *
 * Vercel Hobby limit is 10 GB / 30 days. In June a spike happened because
 * .ts segments were piped through the serverless proxy. Segment proxying is now
 * OFF by default (302 redirect to source = zero bandwidth), but we still want to
 * catch any future spike ourselves instead of waiting for Vercel's email.
 *
 * Persistence reuses the only storage already wired into this project — Firestore
 * (client SDK, which also runs server-side, exactly like appSettingsService).
 * No new paid dependency is introduced.
 *
 * Data model (collection `bandwidth`, one doc per UTC day, id = YYYY-MM-DD):
 *   { date: 'YYYY-MM-DD', bytes: <number, atomically incremented>, updatedAt }
 * The 30-day rolling sum is computed on read from the last 30 daily docs.
 *
 * Alert dedup (collection `bandwidth_alerts`, one doc per UTC day, id = YYYY-MM-DD):
 *   { date, status: 'warning'|'critical', notifiedAt }
 */

const GB = 1024 * 1024 * 1024

const BANDWIDTH_COLLECTION = 'bandwidth'
const ALERT_COLLECTION = 'bandwidth_alerts'

// How many days count toward the rolling window (Vercel measures 30 days).
const WINDOW_DAYS = 30

/** Configurable via env; sensible Hobby-plan defaults. */
export const BANDWIDTH_LIMIT_BYTES =
  Number(process.env.BANDWIDTH_LIMIT_BYTES) || 10 * GB
export const BANDWIDTH_WARN_THRESHOLD =
  Number(process.env.BANDWIDTH_WARN_THRESHOLD) || 0.8

export type BandwidthStatus = 'ok' | 'warning' | 'critical'

export interface BandwidthStats {
  used30d: number
  limit: number
  percent: number // 0..1+ (fraction of the limit used)
  status: BandwidthStatus
  today: number
  dailyBreakdown: { date: string; bytes: number }[]
}

/** UTC calendar day key, e.g. "2026-07-10". Lexicographic order == chronological. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Add `bytes` to today's counter. Fire-and-forget from request handlers.
 * Zero/negative byte counts (e.g. 302 redirects — no body flows through us) are
 * ignored, so accounting never fires for traffic that doesn't hit our origin.
 */
export async function recordBandwidth(bytes: number): Promise<void> {
  if (!Number.isFinite(bytes) || bytes <= 0) return
  const day = dayKey(new Date())
  try {
    await setDoc(
      doc(db, BANDWIDTH_COLLECTION, day),
      { date: day, bytes: increment(bytes), updatedAt: new Date().toISOString() },
      { merge: true }
    )
  } catch (error) {
    // Never let accounting break the actual response.
    console.error('[Bandwidth] Failed to record bytes:', error)
  }
}

function classify(percent: number): BandwidthStatus {
  if (percent >= 1) return 'critical'
  if (percent >= BANDWIDTH_WARN_THRESHOLD) return 'warning'
  return 'ok'
}

/**
 * Read the last 30 daily docs and compute the rolling window. Reads at most 30
 * documents (one query, no per-day getDoc fan-out).
 */
export async function getBandwidthStats(): Promise<BandwidthStats> {
  const now = new Date()
  const todayK = dayKey(now)
  // Inclusive window: today + previous 29 days = 30 calendar days.
  const cutoff = new Date(now.getTime() - (WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000)
  const cutoffK = dayKey(cutoff)

  let breakdown: { date: string; bytes: number }[] = []
  try {
    const q = query(
      collection(db, BANDWIDTH_COLLECTION),
      where('date', '>=', cutoffK),
      orderBy('date', 'asc')
    )
    const snap = await getDocs(q)
    breakdown = snap.docs.map((d) => {
      const data = d.data() as { date?: string; bytes?: number }
      return { date: data.date ?? d.id, bytes: Number(data.bytes) || 0 }
    })
  } catch (error) {
    console.error('[Bandwidth] Failed to read stats:', error)
  }

  const used30d = breakdown.reduce((sum, d) => sum + d.bytes, 0)
  const today = breakdown.find((d) => d.date === todayK)?.bytes ?? 0
  const limit = BANDWIDTH_LIMIT_BYTES
  const percent = limit > 0 ? used30d / limit : 0

  return {
    used30d,
    limit,
    percent,
    status: classify(percent),
    today,
    dailyBreakdown: breakdown,
  }
}

const STATUS_RANK: Record<BandwidthStatus, number> = { ok: 0, warning: 1, critical: 2 }

/**
 * Send a threshold-crossing alert at most once per day per severity level
 * (escalates ok -> warning -> critical). Dedup state lives in Firestore so it
 * survives across serverless invocations.
 *
 * No email/Telegram/webhook secret is configured in this project, so we log a
 * clearly-tagged warning. Wire a real channel at the TODO below when one exists.
 */
export async function maybeNotify(stats: BandwidthStats): Promise<void> {
  if (stats.status === 'ok') return
  const day = dayKey(new Date())
  const alertRef = doc(db, ALERT_COLLECTION, day)
  try {
    const snap = await getDoc(alertRef)
    const already = snap.exists()
      ? ((snap.data().status as BandwidthStatus) ?? null)
      : null
    // Already alerted today at this severity or higher — stay quiet.
    if (already && STATUS_RANK[already] >= STATUS_RANK[stats.status]) return

    await setDoc(
      alertRef,
      { date: day, status: stats.status, notifiedAt: new Date().toISOString() },
      { merge: true }
    )
    sendAlert(stats)
  } catch (error) {
    console.error('[Bandwidth] Failed to process alert:', error)
  }
}

function sendAlert(stats: BandwidthStats): void {
  const usedGb = (stats.used30d / GB).toFixed(2)
  const limitGb = (stats.limit / GB).toFixed(0)
  const pct = Math.round(stats.percent * 100)

  // TODO: no notification channel (Telegram/email/webhook) is configured in this
  // project's env. When one is added, dispatch it here — e.g. read
  // process.env.TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID or a generic webhook URL and
  // POST this message. Until then we surface it in the server logs.
  console.warn(
    `[BANDWIDTH_ALERT] status=${stats.status} used=${usedGb}GB/${limitGb}GB (${pct}%) over ${WINDOW_DAYS}d. ` +
      `If unexpected, check the "Proxy video segments" toggle in /admin.`
  )
}
