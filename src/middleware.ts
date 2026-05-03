import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  return new NextResponse("🚧 Site is tijdelijk offline", {
    status: 503,
  });
}

export const config = {
  matcher: "/:path*",
};