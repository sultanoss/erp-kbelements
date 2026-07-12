"use server";

import bcrypt from "bcryptjs";
import { ActivityType, Marketplace, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { requireAdmin, requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  return Number.parseInt(text(formData, key), 10);
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T12:00:00`) : new Date();
}

export async function loginAction(formData: FormData) {
  const callbackUrl = text(formData, "callbackUrl") || "/";
  try {
    await signIn("credentials", {
      email: text(formData, "email").toLowerCase(),
      password: text(formData, "password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=CredentialsSignin`);
    }
    throw error; // re-throw NEXT_REDIRECT so Next.js can redirect on success
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function upsertItem(formData: FormData) {
  await requireAdmin();
  const sku = text(formData, "sku").toUpperCase();
  const name = text(formData, "name");
  const stock = numberValue(formData, "stock");
  const stockNS = numberValue(formData, "stockNS");
  const minStock = numberValue(formData, "minStock");
  if (!sku || sku.length < 4 || Number.isNaN(stock) || Number.isNaN(minStock)) return;

  await prisma.item.upsert({
    where: { sku },
    update: { name, stock, stockNS, minStock },
    create: { sku, name, stock, stockNS, minStock },
  });

  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function deleteItem(formData: FormData) {
  await requireAdmin();
  await prisma.item.delete({ where: { sku: text(formData, "sku") } });
  revalidatePath("/inventory");
}

export async function createSale(formData: FormData) {
  const user = await requireUser();
  const sku = text(formData, "sku");
  const quantity = numberValue(formData, "quantity");
  const marketplace = text(formData, "marketplace") as Marketplace;
  if (!sku || quantity <= 0) return;

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { sku } });
    const oldStock = item.stock;
    if (oldStock < quantity) throw new Error("Nicht genug Bestand");
    const newStock = oldStock - quantity;

    await tx.sale.create({
      data: { date: dateValue(formData, "date"), marketplace, sku, quantity, source: "LAGER", userId: user.id },
    });
    await tx.item.update({ where: { sku }, data: { stock: newStock } });
    await tx.activityLog.create({
      data: { type: ActivityType.SALE, sku, oldStock, newStock, userId: user.id },
    });
  });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/inventory");
}

export async function createNSSale(formData: FormData) {
  const user = await requireUser();
  const sku = text(formData, "sku");
  const quantity = numberValue(formData, "quantity");
  if (!sku || quantity <= 0) return;

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { sku } });
    const oldStock = item.stockNS;
    if (oldStock < quantity) throw new Error("Nicht genug Bestand im NS-Lager");
    const newStock = oldStock - quantity;

    await tx.sale.create({
      data: { date: dateValue(formData, "date"), marketplace: "DIREKT", sku, quantity, source: "NS_LAGER", userId: user.id },
    });
    await tx.item.update({ where: { sku }, data: { stockNS: newStock } });
    await tx.activityLog.create({
      data: { type: ActivityType.SALE, sku, oldStock, newStock, note: "NS-Lager", userId: user.id },
    });
  });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/inventory");
}

export async function createNSReceipt(formData: FormData) {
  const user = await requireUser();
  const sku = text(formData, "sku");
  const quantity = numberValue(formData, "quantity");
  if (!sku || quantity <= 0) return;

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { sku } });
    const oldStock = item.stockNS;
    const newStock = oldStock + quantity;

    await tx.receipt.create({
      data: { date: dateValue(formData, "date"), sku, quantity, userId: user.id },
    });
    await tx.item.update({ where: { sku }, data: { stockNS: newStock } });
    await tx.activityLog.create({
      data: { type: ActivityType.RECEIPT, sku, oldStock, newStock, note: "NS-Lager", userId: user.id },
    });
  });

  revalidatePath("/");
  revalidatePath("/receipts");
  revalidatePath("/inventory");
}

export async function createReceipt(formData: FormData) {
  const user = await requireUser();
  const sku = text(formData, "sku");
  const quantity = numberValue(formData, "quantity");
  if (!sku || quantity <= 0) return;

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { sku } });
    const oldStock = item.stock;
    const newStock = oldStock + quantity;

    await tx.receipt.create({
      data: { date: dateValue(formData, "date"), sku, quantity, userId: user.id },
    });
    await tx.item.update({ where: { sku }, data: { stock: newStock } });
    await tx.activityLog.create({
      data: { type: ActivityType.RECEIPT, sku, oldStock, newStock, userId: user.id },
    });
  });

  revalidatePath("/");
  revalidatePath("/receipts");
  revalidatePath("/inventory");
}

export async function createCorrection(formData: FormData) {
  const user = await requireUser();
  const sku = text(formData, "sku");
  const quantity = numberValue(formData, "quantity");
  const reason = text(formData, "reason");
  const lager = text(formData, "lager"); // "neuware" | "ns"
  if (!sku || Number.isNaN(quantity) || quantity === 0 || !reason) return;

  const isNS = lager === "ns";

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUniqueOrThrow({ where: { sku } });
    const oldStock = isNS ? item.stockNS : item.stock;
    const newStock = oldStock + quantity;

    await tx.correction.create({
      data: { date: dateValue(formData, "date"), sku, quantity, reason, userId: user.id },
    });
    await tx.item.update({
      where: { sku },
      data: isNS ? { stockNS: newStock } : { stock: newStock },
    });
    await tx.activityLog.create({
      data: { type: ActivityType.CORRECTION, sku, oldStock, newStock, note: `${reason} (${isNS ? "NS-Lager" : "Neuware-Lager"})`, userId: user.id },
    });
  });

  revalidatePath("/");
  revalidatePath("/corrections");
  revalidatePath("/inventory");
}

export async function createInvoice(data: {
  date: string;
  customerName: string;
  customerAddress: string;
  customerNum: string;
  mwstRate: number;
  notes: string;
  paymentInfo: string | null;
  shippingCost: number | null;
  shippingMwst: number;
  paymentMethod: string;
  docType: "rechnung" | "angebot" | "gutschrift";
  originalInvoiceId?: string;
  originalInvoiceNum?: string;
  items: { pos: number; quantity: number; description: string; unitPrice: number; skus: { sku: string; lager: string }[] }[];
}) {
  const user = await requireUser();

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = data.docType === "angebot" ? `AN-${ym}-` : data.docType === "gutschrift" ? `GS-${ym}-` : `RE-${ym}-`;
  const noStock = data.docType === "angebot" || data.docType === "gutschrift";

  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix }, docType: data.docType },
    orderBy: { number: "desc" },
  });
  const seq = last ? parseInt(last.number.split("-")[2] ?? "0", 10) + 1 : 10001;
  const number = `${prefix}${seq}`;

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        number,
        date: new Date(`${data.date}T00:00:00`),
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerNum: data.customerNum || null,
        mwstRate: data.mwstRate,
        shippingCost: data.shippingCost,
        shippingMwst: data.shippingMwst,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        paymentInfo: data.paymentInfo || null,
        docType: data.docType,
        originalInvoiceId: data.originalInvoiceId ?? null,
        originalInvoiceNum: data.originalInvoiceNum ?? null,
        userId: user.id,
        items: {
          create: data.items.map((it) => ({
            pos: it.pos,
            quantity: it.quantity,
            description: it.description,
            unitPrice: it.unitPrice,
            skus: { create: it.skus.map((s) => ({ sku: s.sku, lager: s.lager })) },
          })),
        },
      },
    });

    // Reduce stock only for Rechnungen (not Angebote / Gutschriften)
    if (!noStock) {
      for (const it of data.items) {
        const qty = Math.round(it.quantity);
        for (const s of it.skus) {
          if (!s.sku) continue;
          const item = await tx.item.findUnique({ where: { sku: s.sku } });
          if (!item) continue;
          if (s.lager === "ns") {
            await tx.item.update({ where: { sku: s.sku }, data: { stockNS: Math.max(0, item.stockNS - qty) } });
          } else {
            await tx.item.update({ where: { sku: s.sku }, data: { stock: Math.max(0, item.stock - qty) } });
          }
        }
      }
    }

    return inv;
  });

  revalidatePath("/buchhaltung");
  revalidatePath("/angebot");
  revalidatePath("/gutschrift");
  revalidatePath("/inventory");
  revalidatePath("/");
  if (data.docType === "angebot") redirect(`/angebot/${invoice.id}`);
  if (data.docType === "gutschrift") redirect(`/gutschrift/${invoice.id}`);
  redirect(`/buchhaltung/${invoice.id}`);
}

export async function createGutschrift(originalInvoiceId: string, formData: FormData) {
  const user = await requireUser();

  const inv = await prisma.invoice.findUnique({
    where: { id: originalInvoiceId },
    select: { number: true, customerName: true, customerAddress: true, customerNum: true, mwstRate: true },
  });
  if (!inv) return;

  const betragRaw = String(formData.get("betrag") ?? "").replace(",", ".");
  const betrag = parseFloat(betragRaw);
  if (!betrag || betrag <= 0) return;

  const datumRaw = String(formData.get("datum") ?? "");
  const notiz = String(formData.get("notiz") ?? "").trim();

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `GS-${ym}-`;

  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix }, docType: "gutschrift" },
    orderBy: { number: "desc" },
  });
  const seq = last ? parseInt(last.number.split("-")[2] ?? "0", 10) + 1 : 10001;
  const number = `${prefix}${seq}`;

  const invoice = await prisma.invoice.create({
    data: {
      number,
      date: datumRaw ? new Date(`${datumRaw}T00:00:00`) : now,
      customerName: inv.customerName,
      customerAddress: inv.customerAddress ?? "",
      customerNum: inv.customerNum ?? null,
      mwstRate: inv.mwstRate,
      shippingCost: null,
      shippingMwst: 19,
      paymentMethod: "konto",
      notes: notiz || null,
      paymentInfo: null,
      docType: "gutschrift",
      originalInvoiceId,
      originalInvoiceNum: inv.number,
      userId: user.id,
      items: {
        create: [{ pos: 1, quantity: 1, description: `Gutschrift zu ${inv.number}`, unitPrice: betrag, skus: { create: [] } }],
      },
    },
  });

  revalidatePath("/gutschrift");
  revalidatePath("/buchhaltung");
  redirect(`/gutschrift/${invoice.id}`);
}

export async function stornoInvoice(id: string) {
  await requireUser();
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { include: { skus: true } } },
  });
  if (!inv || inv.status !== "aktiv") return;

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: { status: "storniert", storniertAt: new Date() },
    });
    for (const it of inv.items) {
      const qty = Math.round(it.quantity);
      for (const s of it.skus) {
        if (!s.sku) continue;
        const item = await tx.item.findUnique({ where: { sku: s.sku } });
        if (!item) continue;
        if (s.lager === "ns") {
          await tx.item.update({ where: { sku: s.sku }, data: { stockNS: item.stockNS + qty } });
        } else {
          await tx.item.update({ where: { sku: s.sku }, data: { stock: item.stock + qty } });
        }
      }
    }
  });

  revalidatePath("/buchhaltung");
  revalidatePath("/inventory");
  revalidatePath("/");
  redirect("/buchhaltung");
}

export async function updateInvoice(
  invoiceId: string,
  data: {
    date: string;
    customerName: string;
    customerAddress: string;
    customerNum: string;
    mwstRate: number;
    notes: string;
    paymentInfo: string | null;
    shippingCost: number | null;
    shippingMwst: number;
    paymentMethod: string;
    items: { pos: number; quantity: number; description: string; unitPrice: number; skus: { sku: string; lager: string }[] }[];
  }
) {
  await requireUser();

  await prisma.$transaction(async (tx) => {
    const old = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: { include: { skus: true } } },
    });

    // Alten Lagerbestand rückbuchen (nur für Rechnungen)
    if (old && old.docType !== "angebot" && old.docType !== "gutschrift") {
      for (const it of old.items) {
        const qty = Math.round(it.quantity);
        for (const s of it.skus) {
          if (!s.sku) continue;
          const item = await tx.item.findUnique({ where: { sku: s.sku } });
          if (!item) continue;
          if (s.lager === "ns") {
            await tx.item.update({ where: { sku: s.sku }, data: { stockNS: item.stockNS + qty } });
          } else {
            await tx.item.update({ where: { sku: s.sku }, data: { stock: item.stock + qty } });
          }
        }
      }
    }

    await tx.invoiceItem.deleteMany({ where: { invoiceId } });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        date: new Date(`${data.date}T00:00:00`),
        customerName: data.customerName,
        customerAddress: data.customerAddress,
        customerNum: data.customerNum || null,
        mwstRate: data.mwstRate,
        shippingCost: data.shippingCost,
        shippingMwst: data.shippingMwst,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        paymentInfo: data.paymentInfo || null,
        items: {
          create: data.items.map((it) => ({
            pos: it.pos,
            quantity: it.quantity,
            description: it.description,
            unitPrice: it.unitPrice,
            skus: { create: it.skus.map((s) => ({ sku: s.sku, lager: s.lager })) },
          })),
        },
      },
    });

    // Neuen Lagerbestand abbuchen (nur für Rechnungen)
    if (!old || (old.docType !== "angebot" && old.docType !== "gutschrift")) {
      for (const it of data.items) {
        const qty = Math.round(it.quantity);
        for (const s of it.skus) {
          if (!s.sku) continue;
          const item = await tx.item.findUnique({ where: { sku: s.sku } });
          if (!item) continue;
          if (s.lager === "ns") {
            await tx.item.update({ where: { sku: s.sku }, data: { stockNS: Math.max(0, item.stockNS - qty) } });
          } else {
            await tx.item.update({ where: { sku: s.sku }, data: { stock: Math.max(0, item.stock - qty) } });
          }
        }
      }
    }
  });

  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { docType: true } });
  const isAngebot = inv?.docType === "angebot";

  revalidatePath("/buchhaltung");
  revalidatePath("/angebot");
  revalidatePath(`/buchhaltung/${invoiceId}`);
  revalidatePath(`/angebot/${invoiceId}`);
  revalidatePath("/inventory");
  revalidatePath("/");
  redirect(isAngebot ? `/angebot/${invoiceId}` : `/buchhaltung/${invoiceId}`);
}

export async function upsertUser(formData: FormData) {
  const actor = await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const role = text(formData, "role") as Role;
  const active = formData.get("active") === "on";

  if (!name || !email) return;

  const data = {
    name,
    email,
    role,
    active,
    ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
  };

  if (id) {
    await prisma.user.update({ where: { id }, data });
  } else {
    if (!password) return;
    await prisma.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
  }

  await prisma.activityLog.create({
    data: { type: ActivityType.USER_CHANGE, note: `${id ? "Benutzer bearbeitet" : "Benutzer angelegt"}: ${email}`, userId: actor.id },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const actor = await requireAdmin();
  const id = text(formData, "id");
  if (id === actor.id) return;

  const user = await prisma.user.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { type: ActivityType.USER_CHANGE, note: `Benutzer gelöscht: ${user.email}`, userId: actor.id },
  });

  revalidatePath("/admin/users");
}

const CSV_MARKETPLACE_MAP: Record<string, string> = {
  otto: "OTTO",
  kaufland: "KAUFLAND",
  "media markt": "MEDIAMARKT",
  mediamarkt: "MEDIAMARKT",
  amazon: "AMAZON",
  ebay: "EBAY",
  shopify: "SHOPIFY",
};

type ImportResult = { ok: boolean; imported: number; skipped: number; errors: string[]; saleIds: string[] };

function parseRowsFromCSV(raw: string): { headers: string[]; rows: string[][] } {
  const text = raw.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0]?.includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

async function parseRowsFromXLSX(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  const headers = (data[0] ?? []).map((h) => String(h).trim());
  const rows = data.slice(1).map((r) => r.map((c) => String(c).trim()));
  return { headers, rows };
}

export async function importSalesCSV(_prev: unknown, formData: FormData): Promise<ImportResult> {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  const dateRaw = text(formData, "date");
  const source = text(formData, "source") || "TAGESVERKAUF";
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date();

  if (!file || file.size === 0) return { ok: false, imported: 0, skipped: 0, errors: ["Keine Datei ausgewählt."], saleIds: [] };

  let headers: string[];
  let rows: string[][];

  const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
  if (isXLSX) {
    ({ headers, rows } = await parseRowsFromXLSX(await file.arrayBuffer()));
  } else {
    ({ headers, rows } = parseRowsFromCSV(await file.text()));
  }

  if (!headers.length) return { ok: false, imported: 0, skipped: 0, errors: ["Datei hat keine Kopfzeile."], saleIds: [] };

  const marketplaceIndices: { index: number; enum: string }[] = [];
  const unrecognizedCols: string[] = [];
  for (let i = 1; i < headers.length; i++) {
    const key = headers[i].toLowerCase().trim();
    if (CSV_MARKETPLACE_MAP[key]) {
      marketplaceIndices.push({ index: i, enum: CSV_MARKETPLACE_MAP[key] });
    } else if (headers[i].trim()) {
      unrecognizedCols.push(headers[i]);
    }
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const saleIds: string[] = [];

  if (unrecognizedCols.length > 0) {
    errors.push(`Spalten nicht erkannt (werden ignoriert): ${unrecognizedCols.join(", ")}`);
  }

  for (const cols of rows) {
    const sku = cols[0];
    if (!sku || sku.toLowerCase().startsWith("gesamt")) continue;

    for (const { index, enum: marketplace } of marketplaceIndices) {
      const quantity = parseInt(cols[index] ?? "", 10);
      if (!quantity || quantity <= 0) { skipped++; continue; }

      try {
        await prisma.$transaction(async (tx) => {
          const item = await tx.item.findUnique({ where: { sku } });
          if (!item) throw new Error(`SKU "${sku}" nicht gefunden`);
          const newStock = item.stock - quantity;
          const sale = await tx.sale.create({
            data: { date, marketplace: marketplace as Marketplace, sku, quantity, source, userId: user.id },
          });
          saleIds.push(sale.id);
          await tx.item.update({ where: { sku }, data: { stock: newStock } });
          await tx.activityLog.create({
            data: { type: ActivityType.SALE, sku, oldStock: item.stock, newStock, userId: user.id },
          });
        });
        imported++;
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/inventory");

  return { ok: true, imported, skipped, errors, saleIds };
}

type StockImportResult = { ok: boolean; imported: number; errors: string[] };

export async function importStock(_prev: unknown, formData: FormData): Promise<StockImportResult> {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, imported: 0, errors: ["Keine Datei ausgewählt."] };

  const { headers, rows } = await parseRowsFromXLSX(await file.arrayBuffer());
  if (!headers.length) return { ok: false, imported: 0, errors: ["Datei hat keine Kopfzeile."] };

  let imported = 0;
  const errors: string[] = [];

  for (const cols of rows) {
    const sku = String(cols[0] ?? "").trim();
    if (!sku || sku.toLowerCase() === "artikel") continue;
    const stock = parseInt(String(cols[1] ?? ""), 10);
    if (isNaN(stock) || stock < 0) continue;

    const item = await prisma.item.findUnique({ where: { sku } });
    if (!item) { errors.push(`SKU "${sku}" nicht gefunden`); continue; }

    await prisma.item.update({ where: { sku }, data: { stock } });
    await prisma.activityLog.create({
      data: { type: ActivityType.CORRECTION, sku, oldStock: item.stock, newStock: stock, note: "Bestandsimport", userId: user.id },
    });
    imported++;
  }

  revalidatePath("/inventory");
  revalidatePath("/corrections");
  return { ok: true, imported, errors };
}

export async function undoImport(_prev: unknown, formData: FormData): Promise<{ done: boolean; count: number }> {
  await requireUser();
  const ids = text(formData, "ids").split(",").filter(Boolean);
  if (!ids.length) return { done: false, count: 0 };

  const sales = await prisma.sale.findMany({ where: { id: { in: ids } } });
  for (const s of sales) {
    await prisma.item.update({ where: { sku: s.sku }, data: { stock: { increment: s.quantity } } });
  }
  await prisma.sale.deleteMany({ where: { id: { in: ids } } });
  await prisma.activityLog.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/inventory");

  return { done: true, count: sales.length };
}

type HerdsetImportResult = { ok: boolean; imported: number; errors: string[]; saleIds: string[] };

const HERDSET_PORTAL_MAP: Record<string, string> = {
  amazon: "AMAZON",
  mediamarkt: "MEDIAMARKT",
  "media markt": "MEDIAMARKT",
  otto: "OTTO",
  kaufland: "KAUFLAND",
  ebay: "EBAY",
};

export async function importHerdsetSales(_prev: unknown, formData: FormData): Promise<HerdsetImportResult> {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  const dateRaw = text(formData, "date");
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date();

  if (!file || file.size === 0) return { ok: false, imported: 0, errors: ["Keine Datei ausgewählt."], saleIds: [] };

  const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
  const { rows } = isXLSX
    ? await parseRowsFromXLSX(await file.arrayBuffer())
    : parseRowsFromCSV(await file.text());

  let imported = 0;
  const errors: string[] = [];
  const saleIds: string[] = [];
  let currentMarketplace: string | null = null;

  // Skip header row (Artikel | Menge), then parse sections
  for (const cols of rows) {
    const first = String(cols[0] ?? "").trim();
    const second = String(cols[1] ?? "").trim();
    if (!first) continue;

    const portalKey = first.toLowerCase();
    if (HERDSET_PORTAL_MAP[portalKey]) {
      currentMarketplace = HERDSET_PORTAL_MAP[portalKey];
      continue;
    }

    if (!currentMarketplace) continue;

    const quantity = parseInt(second, 10);
    if (!quantity || quantity <= 0) continue;

    try {
      const sale = await prisma.herdsetSale.create({
        data: { date, marketplace: currentMarketplace as Marketplace, label: first, quantity, userId: user.id },
      });
      saleIds.push(sale.id);
      imported++;
    } catch (e) {
      errors.push(`${first}: ${(e as Error).message}`);
    }
  }

  revalidatePath("/auswertung");
  return { ok: true, imported, errors, saleIds };
}

export async function undoHerdsetImport(_prev: unknown, formData: FormData): Promise<{ done: boolean; count: number }> {
  await requireUser();
  const ids = text(formData, "ids").split(",").filter(Boolean);
  if (!ids.length) return { done: false, count: 0 };
  await prisma.herdsetSale.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/auswertung");
  return { done: true, count: ids.length };
}

type ReceiptImportResult = { ok: boolean; imported: number; errors: string[]; receiptIds: string[] };

export async function importReceiptsExcel(_prev: unknown, formData: FormData): Promise<ReceiptImportResult> {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  const dateRaw = text(formData, "date");
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date();

  if (!file || file.size === 0) return { ok: false, imported: 0, errors: ["Keine Datei ausgewählt."], receiptIds: [] };

  let headers: string[];
  let rows: string[][];
  const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
  if (isXLSX) {
    ({ headers, rows } = await parseRowsFromXLSX(await file.arrayBuffer()));
  } else {
    ({ headers, rows } = parseRowsFromCSV(await file.text()));
  }

  if (!headers.length) return { ok: false, imported: 0, errors: ["Datei hat keine Kopfzeile."], receiptIds: [] };

  let imported = 0;
  const errors: string[] = [];
  const receiptIds: string[] = [];

  for (const cols of rows) {
    const sku = cols[0];
    if (!sku || sku.toLowerCase().startsWith("gesamt")) continue;
    const quantity = parseInt(cols[1] ?? "", 10);
    if (!quantity || quantity <= 0) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const item = await tx.item.findUnique({ where: { sku } });
        if (!item) throw new Error(`SKU "${sku}" nicht gefunden`);
        const newStock = item.stock + quantity;
        const receipt = await tx.receipt.create({
          data: { date, sku, quantity, userId: user.id },
        });
        receiptIds.push(receipt.id);
        await tx.item.update({ where: { sku }, data: { stock: newStock } });
        await tx.activityLog.create({
          data: { type: ActivityType.RECEIPT, sku, oldStock: item.stock, newStock, userId: user.id },
        });
      });
      imported++;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  revalidatePath("/");
  revalidatePath("/receipts");
  revalidatePath("/inventory");
  return { ok: true, imported, errors, receiptIds };
}

export async function undoReceiptImport(_prev: unknown, formData: FormData): Promise<{ done: boolean; count: number }> {
  await requireUser();
  const ids = text(formData, "ids").split(",").filter(Boolean);
  if (!ids.length) return { done: false, count: 0 };

  const receipts = await prisma.receipt.findMany({ where: { id: { in: ids } } });
  for (const r of receipts) {
    await prisma.item.update({ where: { sku: r.sku }, data: { stock: { decrement: r.quantity } } });
  }
  await prisma.receipt.deleteMany({ where: { id: { in: ids } } });
  await prisma.activityLog.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/");
  revalidatePath("/receipts");
  revalidatePath("/inventory");
  return { done: true, count: receipts.length };
}

export async function undoMonthSales(_prev: unknown, formData: FormData): Promise<{ done: boolean; count: number; month: string }> {
  await requireUser();
  const month = text(formData, "month"); // "2026-06"
  if (!month) return { done: false, count: 0, month: "" };

  const [year, mon] = month.split("-").map(Number);
  const from = new Date(year, mon - 1, 1);
  const to = new Date(year, mon, 0, 23, 59, 59);

  const sales = await prisma.sale.findMany({ where: { date: { gte: from, lte: to } } });
  for (const s of sales) {
    await prisma.item.update({ where: { sku: s.sku }, data: { stock: { increment: s.quantity } } });
  }
  const saleIds = sales.map((s) => s.id);
  await prisma.activityLog.deleteMany({ where: { type: ActivityType.SALE, createdAt: { gte: from, lte: to } } });
  await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/auswertung");
  return { done: true, count: sales.length, month };
}

export async function goHome() {
  redirect("/");
}
