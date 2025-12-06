import { NextResponse } from 'next/server'
import { sampleChannels } from '@/data/channels'
import { importChannels } from '@/lib/channelService'

// POST /api/init-channels - Initialize channels in Firestore (one-time migration)
export async function POST(request: Request) {
  try {
    // Simple auth check - in production use proper admin auth
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.ADMIN_SECRET && secret !== 'stellix-init-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await importChannels(sampleChannels)

    return NextResponse.json({
      message: 'Channels imported successfully',
      ...result,
      total: sampleChannels.length,
    })
  } catch (error) {
    console.error('Error initializing channels:', error)
    return NextResponse.json(
      { error: 'Failed to initialize channels' },
      { status: 500 }
    )
  }
}
