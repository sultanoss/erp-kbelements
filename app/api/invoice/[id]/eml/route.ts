import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const subject = `KB ELEMENTS Rechnung ${inv.number}`;
  const body = [
    "Sehr geehrte Damen und Herren,",
    "",
    "anbei übersenden wir Ihnen die Rechnung als Anhang.",
    "",
    "Bei weiteren Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.",
    "",
    "Mit freundlichen Grüßen / Best regards",
    "",
    "",
    "KB ELEMENTS GmbH",
    "Im Weidchen 21",
    "52353 Düren",
    "",
    "www.kbelements.de",
    "",
    "Amtsgericht Düren – HRB 8363",
    "USt-IdNr.: DE323000595",
    "",
    "P.S. Please consider the environment and do not print this email unless necessary.",
  ].join("\r\n");

  const bodyB64 = Buffer.from(body, "utf-8").toString("base64");
  const subjectB64 = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;

  const eml = [
    "MIME-Version: 1.0",
    `Subject: ${subjectB64}`,
    "From: verkauf@kbelements.de",
    "To: ",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    bodyB64,
  ].join("\r\n");

  const filename = `Rechnung-${inv.number}.eml`;
  return new NextResponse(eml, {
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
