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

  const userRole = token.role as string;

  // Super admins: send directly to their panel; block from the regular app
  if (userRole === "super_admin") {
    if (!pathname.startsWith("/super-admin") && !pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/super-admin", req.url));
    }
    return NextResponse.next();
  }

  // Role-based access control:
  // - admin: full access to tenant data
  // - employee: only access to /production/tasks
  // - user: regular user access (no manager features, no reports)

  // Protect manager routes: Only admins
  if (pathname.startsWith("/manager") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/welcomePage", req.url));
  }

  // Employees can only access production tasks
  if (userRole === "employee") {
    const allowedPaths = ["/production/tasks", "/production/board", "/welcomePage", "/api"];
    const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/production/tasks", req.url));
    }
  }

  // Regular users cannot access manager pages or employee reports
  if (userRole === "user") {
    if (pathname.startsWith("/manager") || pathname.startsWith("/api/employee-reports")) {
      return NextResponse.redirect(new URL("/welcomePage", req.url));
    }
  }

  // Block non-super_admin users from the super-admin panel
  if (pathname.startsWith("/super-admin")) {
    return NextResponse.redirect(new URL("/welcomePage", req.url));
  }

  // Allow the request to continue if everything is OK.
  return NextResponse.next();
}

// Specify which paths this middleware applies to.
export const config = {
  matcher: [
    "/welcomePage/:path*",
    "/manager/:path*",
    "/production/:path*",
    "/inventory/:path*",
    "/invoice/:path*",
    "/supplier/:path*",
    "/super-admin/:path*",
  ],
};
