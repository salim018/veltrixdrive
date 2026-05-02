import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { ip, reason, source, country, duration } = await request.json()
    if (!ip) return NextResponse.json({ error: 'IP required' }, { status: 400 })

    let expires_at = null
    if (duration === '1h') expires_at = new Date(Date.now() + 3600000).toISOString()
    if (duration === '24h') expires_at = new Date(Date.now() + 86400000).toISOString()
    if (duration === '7d') expires_at = new Date(Date.now() + 604800000).toISOString()

    const admin = createAdminClient()
    const { error } = await admin
      .from('blocked_ips')
      .upsert({ ip, reason, source, country, duration, expires_at })

    if (error) throw error
    return NextResponse.json({ success: true, ip })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { ip } = await request.json()
    if (!ip) return NextResponse.json({ error: 'IP required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('blocked_ips').delete().eq('ip', ip)

    if (error) throw error
    return NextResponse.json({ success: true, ip })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const admin = createAdminClient()
    console.log('Admin client created:', !!admin)

    const { data, error } = await admin
      .from('blocked_ips')
      .select('*')
      .order('blocked_at', { ascending: false })

    console.log('Data:', data, 'Error:', error)

    if (error) throw error
    return NextResponse.json({ blocked: data || [] })
  } catch (err) {
    console.error('BLOCK API ERROR:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}