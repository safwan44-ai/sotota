import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/session";

// The first gate. It stops anyone without a genuine login ticket from even
// reaching /admin. Every admin page and action ALSO checks again.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginPage = pathname === "/admin/login";

  if (inAdmin && !isLoginPage) {
    const ticket = request.cookies.get(sessionCookieName())?.value;
    if (!verifySessionToken(ticket)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Lets the layout know which page this is (to hide the shop menu in admin).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (inAdmin) response.headers.set("Cache-Control", "no-store");

  return response;
}

export const config = {
  // Everything except Next.js internals and files with an extension (images etc.)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};