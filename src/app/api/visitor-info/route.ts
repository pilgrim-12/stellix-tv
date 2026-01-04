import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Get IP from headers (works on Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  // Priority: CF > X-Real-IP > X-Forwarded-For > fallback
  let ip = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : null) || 'unknown'

  // Get country from Vercel headers
  const country = request.headers.get('x-vercel-ip-country') || null
  const countryName = request.headers.get('x-vercel-ip-country-region') || country || null
  const city = request.headers.get('x-vercel-ip-city') || null

  return NextResponse.json({
    ip,
    country: countryName,
    countryCode: country,
    city: city ? decodeURIComponent(city) : null
  })
}
