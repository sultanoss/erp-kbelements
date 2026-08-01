"use server";

import { requireUser } from "@/lib/auth-guards";

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN ?? "";
const TEAM_ID = process.env.VERCEL_TEAM_ID ?? "";
const PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";

const ENV_IDS: Record<string, string> = {
  EBAY_REFRESH_TOKEN: "u41ae8z1iZIDSYNh",
  EBAY_OUTLET_REFRESH_TOKEN: "B9yltTcGYZWf2oWE",
};

export async function saveEbayToken(envKey: string, token: string): Promise<{ ok: boolean; message: string }> {
  await requireUser();

  const value = token.trim();
  if (!value) return { ok: false, message: "Token darf nicht leer sein" };

  const envId = ENV_IDS[envKey];
  if (!envId) return { ok: false, message: "Unbekannte Umgebungsvariable" };

  if (!VERCEL_TOKEN || !TEAM_ID || !PROJECT_ID) {
    return { ok: false, message: "Vercel-Konfiguration fehlt" };
  }

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${envId}?teamId=${TEAM_ID}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, message: `Vercel Fehler: ${res.status} ${text}` };
  }

  // Redeploy starten
  await fetch(`https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "erp-kbelements", projectId: PROJECT_ID, target: "production" }),
  });

  return { ok: true, message: "Token gespeichert — Redeploy gestartet" };
}
