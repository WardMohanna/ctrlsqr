// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Ensure you have NEXTAUTH_SECRET set in your env variables
export async function middleware(req: NextRequest) {
  // Get the token from the request. It contains your session info.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Redirect to login if user is not authenticated
  if (!token) {
    const loginUrl = new URL("/", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Protect the manager page: Only allow users with an "admin" role.
  if (pathname.startsWith("/manager") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // You can add more role checks for other routes as needed

  // Allow the request to continue if everything is OK.
  return NextResponse.next();
}

// Specify which paths this middleware applies to.
// "/manager/:path*"
// "/logs/:path*"
export const config = {
  matcher: [],
};
