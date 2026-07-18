import { createHash } from "crypto";

const ENDPOINT_URL = "https://erp-kbelements-sultanoss-projects.vercel.app/api/ebay/account-deletion";

// GET: eBay Challenge-Verifikation
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challengeCode = searchParams.get("challenge_code");

  if (!challengeCode) {
    return Response.json({ error: "challenge_code fehlt" }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN ?? "";
  if (!verificationToken) {
    return Response.json({ error: "EBAY_VERIFICATION_TOKEN nicht konfiguriert" }, { status: 500 });
  }

  // eBay erwartet: SHA-256(challengeCode + verificationToken + endpointUrl) als Hex
  const hash = createHash("sha256")
    .update(challengeCode + verificationToken + ENDPOINT_URL)
    .digest("hex");

  return Response.json({ challengeResponse: hash });
}

// POST: Account-Löschbenachrichtigung von eBay
export async function POST() {
  // Wir speichern keine dauerhaften Nutzerdaten von eBay-Käufern → nur bestätigen
  return new Response(null, { status: 200 });
}
