import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  // Haal IP op
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || '0.0.0.0'

  // Check of IP geblokkeerd is in Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date().toISOString()

    const { data } = await supabase
      .from('blocked_ips')
      .select('ip, expires_at')
      .eq('ip', ip)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1)
      .single()

    if (data) {
      // IP is geblokkeerd — geef 403 terug
      return new NextResponse(
        JSON.stringify({ 
          error: 'Forbidden', 
          message: 'Your IP has been blocked.' 
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  } catch(e) {
    // Bij fout gewoon doorlaten — niet blokkeren
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}









import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // allow login page + api
  if (
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // block everything else for now
  return new NextResponse("Private beta - access restricted", {
    status: 403,
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};