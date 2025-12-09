/**
 * Firebase Quota Tracker
 * Tracks all reads/writes to Firebase to identify quota usage issues
 */

export interface QuotaStats {
  reads: number
  writes: number
  deletes: number
  queries: number
  batches: number
  totalOperations: number
  byFunction: Record<string, { reads: number; writes: number; deletes: number }>
  history: Array<{
    timestamp: number
    operation: 'read' | 'write' | 'delete' | 'query' | 'batch'
    function: string
    count: number
  }>
}

interface StoredStats {
  date: string
  stats: QuotaStats
}

const STORAGE_KEY = 'stellix-firebase-quota-stats'
const HISTORY_LIMIT = 1000 // Keep last 1000 operations

// Initialize stats
let stats: QuotaStats = {
  reads: 0,
  writes: 0,
  deletes: 0,
  queries: 0,
  batches: 0,
  totalOperations: 0,
  byFunction: {},
  history: [],
}

// Load stats from localStorage on init
export function loadStats(): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: StoredStats = JSON.parse(stored)
      const today = new Date().toDateString()

      // If it's a new day, reset stats
      if (parsed.date !== today) {
        resetStats()
      } else {
        stats = parsed.stats
      }
    }
  } catch {
    // Invalid data, reset
    resetStats()
  }
}

// Save stats to localStorage
function saveStats(): void {
  if (typeof window === 'undefined') return

  try {
    const toStore: StoredStats = {
      date: new Date().toDateString(),
      stats,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // Storage full or not available
  }
}

// Reset stats
export function resetStats(): void {
  stats = {
    reads: 0,
    writes: 0,
    deletes: 0,
    queries: 0,
    batches: 0,
    totalOperations: 0,
    byFunction: {},
    history: [],
  }
  saveStats()
}

// Track a read operation
export function trackRead(functionName: string, count: number = 1): void {
  stats.reads += count
  stats.totalOperations += count

  if (!stats.byFunction[functionName]) {
    stats.byFunction[functionName] = { reads: 0, writes: 0, deletes: 0 }
  }
  stats.byFunction[functionName].reads += count

  // Add to history
  stats.history.push({
    timestamp: Date.now(),
    operation: 'read',
    function: functionName,
    count,
  })

  // Trim history if too long
  if (stats.history.length > HISTORY_LIMIT) {
    stats.history = stats.history.slice(-HISTORY_LIMIT)
  }

  saveStats()
  logOperation('READ', functionName, count)
}

// Track a write operation
export function trackWrite(functionName: string, count: number = 1): void {
  stats.writes += count
  stats.totalOperations += count

  if (!stats.byFunction[functionName]) {
    stats.byFunction[functionName] = { reads: 0, writes: 0, deletes: 0 }
  }
  stats.byFunction[functionName].writes += count

  stats.history.push({
    timestamp: Date.now(),
    operation: 'write',
    function: functionName,
    count,
  })

  if (stats.history.length > HISTORY_LIMIT) {
    stats.history = stats.history.slice(-HISTORY_LIMIT)
  }

  saveStats()
  logOperation('WRITE', functionName, count)
}

// Track a delete operation
export function trackDelete(functionName: string, count: number = 1): void {
  stats.deletes += count
  stats.totalOperations += count

  if (!stats.byFunction[functionName]) {
    stats.byFunction[functionName] = { reads: 0, writes: 0, deletes: 0 }
  }
  stats.byFunction[functionName].deletes += count

  stats.history.push({
    timestamp: Date.now(),
    operation: 'delete',
    function: functionName,
    count,
  })

  if (stats.history.length > HISTORY_LIMIT) {
    stats.history = stats.history.slice(-HISTORY_LIMIT)
  }

  saveStats()
  logOperation('DELETE', functionName, count)
}

// Track a query operation (reads multiple docs)
export function trackQuery(functionName: string, docsCount: number): void {
  stats.queries++
  stats.reads += docsCount
  stats.totalOperations += docsCount

  if (!stats.byFunction[functionName]) {
    stats.byFunction[functionName] = { reads: 0, writes: 0, deletes: 0 }
  }
  stats.byFunction[functionName].reads += docsCount

  stats.history.push({
    timestamp: Date.now(),
    operation: 'query',
    function: functionName,
    count: docsCount,
  })

  if (stats.history.length > HISTORY_LIMIT) {
    stats.history = stats.history.slice(-HISTORY_LIMIT)
  }

  saveStats()
  logOperation('QUERY', functionName, docsCount)
}

// Track a batch operation
export function trackBatch(functionName: string, operationsCount: number, type: 'write' | 'delete'): void {
  stats.batches++

  if (type === 'write') {
    stats.writes += operationsCount
  } else {
    stats.deletes += operationsCount
  }
  stats.totalOperations += operationsCount

  if (!stats.byFunction[functionName]) {
    stats.byFunction[functionName] = { reads: 0, writes: 0, deletes: 0 }
  }

  if (type === 'write') {
    stats.byFunction[functionName].writes += operationsCount
  } else {
    stats.byFunction[functionName].deletes += operationsCount
  }

  stats.history.push({
    timestamp: Date.now(),
    operation: 'batch',
    function: functionName,
    count: operationsCount,
  })

  if (stats.history.length > HISTORY_LIMIT) {
    stats.history = stats.history.slice(-HISTORY_LIMIT)
  }

  saveStats()
  logOperation(`BATCH ${type.toUpperCase()}`, functionName, operationsCount)
}

// Get current stats
export function getStats(): QuotaStats {
  return { ...stats }
}

// Get stats summary for display
export function getStatsSummary(): {
  total: number
  reads: number
  writes: number
  deletes: number
  topFunctions: Array<{ name: string; total: number; reads: number; writes: number; deletes: number }>
  lastHour: number
  last5Minutes: number
} {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const fiveMinutesAgo = now - 5 * 60 * 1000

  const lastHourOps = stats.history.filter((h) => h.timestamp > oneHourAgo)
  const last5MinOps = stats.history.filter((h) => h.timestamp > fiveMinutesAgo)

  const topFunctions = Object.entries(stats.byFunction)
    .map(([name, data]) => ({
      name,
      total: data.reads + data.writes + data.deletes,
      ...data,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return {
    total: stats.totalOperations,
    reads: stats.reads,
    writes: stats.writes,
    deletes: stats.deletes,
    topFunctions,
    lastHour: lastHourOps.reduce((sum, op) => sum + op.count, 0),
    last5Minutes: last5MinOps.reduce((sum, op) => sum + op.count, 0),
  }
}

// Log operation to console with timestamp (for debugging)
function logOperation(type: string, functionName: string, count: number): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const time = new Date().toLocaleTimeString()
    console.log(
      `%c[Firebase ${type}] %c${functionName} %c(${count} docs) %cTotal: R=${stats.reads} W=${stats.writes} D=${stats.deletes}`,
      'color: #ff9800; font-weight: bold',
      'color: #2196f3',
      'color: #4caf50',
      'color: #9e9e9e'
    )
  }
}

// Initialize on import
if (typeof window !== 'undefined') {
  loadStats()
}
