import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const isLoggedIn = Boolean(token);
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && pathname !== "/login") {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && pathname === "/login") {
    return Response.redirect(new URL("/", request.nextUrl.origin));
  }

  if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    return Response.redirect(new URL("/", request.nextUrl.origin));
  }
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
