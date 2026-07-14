import { NextResponse } from "next/server";

const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/otto/callback`;

export async function GET() {
  const clientId = process.env.OTTO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "OTTO_CLIENT_ID fehlt" }, { status: 500 });
  }

  const authUrl = new URL("https://api.otto.market/oauth2/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", "installation partnerId");

  return NextResponse.redirect(authUrl.toString());
}
