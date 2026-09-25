"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function getUserId(session: { user?: { id?: string } | null } | null) {
  const userId = session?.user?.id;
  if (!userId) throw new Error("Nicht angemeldet");
  return userId;
}

function nextDeliveryNoteNumber(last: string | null): string {
  if (!last) return "LS-AIT-0001";
  const match = last.match(/LS-AIT-(\d+)$/);
  const n = match ? parseInt(match[1], 10) + 1 : 1;
  return `LS-AIT-${String(n).padStart(4, "0")}`;
}

export type DeliveryNoteLine = {
  sku: string;
  quantity: number;
  palletCount: number;
};

export async function createDeliveryNote(pickupDate: string, notes: string, lines: DeliveryNoteLine[]) {
  const session = await auth();
  const userId = getUserId(session);

  if (lines.length === 0) throw new Error("Mindestens eine Position erforderlich");

  // Artikelnamen aus ERP holen
  const skus = lines.map(l => l.sku);
  const items = await prisma.item.findMany({ where: { sku: { in: skus } }, select: { sku: true, name: true } });
  const nameMap = new Map(items.map(i => [i.sku, i.name]));

  // Nächste Nummer
  const lastNote = await prisma.aitDeliveryNote.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const number = nextDeliveryNoteNumber(lastNote?.number ?? null);

  await prisma.aitDeliveryNote.create({
    data: {
      number,
      pickupDate: new Date(pickupDate),
      notes: notes || null,
      userId,
      lines: {
        create: lines.map(l => ({
          sku: l.sku,
          description: nameMap.get(l.sku) || l.sku,
          quantity: l.quantity,
          palletCount: l.palletCount ?? 1,
        })),
      },
    },
  });

  revalidatePath("/ait/warenanmeldung");
  return number;
}

export async function updateDeliveryNote(id: string, pickupDate: string, notes: string, lines: DeliveryNoteLine[]) {
  const session = await auth();
  getUserId(session);

  const note = await prisma.aitDeliveryNote.findUnique({ where: { id }, select: { status: true } });
  if (!note) throw new Error("Lieferschein nicht gefunden");
  if (note.status === "PICKED_UP") throw new Error("Abgeholte Lieferscheine können nicht bearbeitet werden");

  // Artikelnamen aus ERP
  const skus = lines.map(l => l.sku);
  const items = await prisma.item.findMany({ where: { sku: { in: skus } }, select: { sku: true, name: true } });
  const nameMap = new Map(items.map(i => [i.sku, i.name]));

  await prisma.aitDeliveryNote.update({
    where: { id },
    data: {
      pickupDate: new Date(pickupDate),
      notes: notes || null,
      lines: {
        deleteMany: {},
        create: lines.map(l => ({
          sku: l.sku,
          description: nameMap.get(l.sku) || l.sku,
          quantity: l.quantity,
          palletCount: l.palletCount ?? 1,
        })),
      },
    },
  });

  revalidatePath("/ait/warenanmeldung");
}

export async function deleteDeliveryNote(id: string) {
  const session = await auth();
  getUserId(session);

  const note = await prisma.aitDeliveryNote.findUnique({ where: { id }, select: { status: true } });
  if (!note) throw new Error("Lieferschein nicht gefunden");
  if (note.status === "PICKED_UP") throw new Error("Abgeholte Lieferscheine können nicht gelöscht werden");

  await prisma.aitDeliveryNote.delete({ where: { id } });
  revalidatePath("/ait/warenanmeldung");
}

export async function markAsPickedUp(id: string) {
  const session = await auth();
  const userId = getUserId(session);

  const note = await prisma.aitDeliveryNote.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!note) throw new Error("Lieferschein nicht gefunden");
  if (note.status === "PICKED_UP") return; // idempotent

  await prisma.$transaction(async (tx) => {
    for (const line of note.lines) {
      const dbItem = await tx.item.findUnique({
        where: { sku: line.sku },
        select: { stock: true, name: true },
      });
      if (!dbItem) throw new Error(`Artikel ${line.sku} nicht gefunden`);
      if (dbItem.stock < line.quantity) {
        throw new Error(
          `Unzureichender Neuware-Bestand für ${line.sku} (${dbItem.name || line.sku}): ${dbItem.stock} verfügbar, ${line.quantity} benötigt`
        );
      }
    }

    for (const line of note.lines) {
      const before = await tx.item.findUnique({ where: { sku: line.sku }, select: { stock: true, stockAIT: true } });
      if (!before) continue;

      await tx.item.update({
        where: { sku: line.sku },
        data: {
          stock: { decrement: line.quantity },
          stockAIT: { increment: line.quantity },
        },
      });

      await tx.activityLog.create({
        data: {
          type: "CORRECTION",
          sku: line.sku,
          oldStock: before.stock,
          newStock: before.stock - line.quantity,
          note: `AIT Lieferschein ${note.number}: Neuware→AIT Lager ${line.quantity}x ${line.sku}`,
          userId,
        },
      });
    }

    await tx.aitDeliveryNote.update({
      where: { id },
      data: { status: "PICKED_UP", pickedUpAt: new Date() },
    });
  });

  revalidatePath("/ait/warenanmeldung");
  revalidatePath("/inventory");
  revalidatePath("/lagerprotokoll");
}

export async function uploadScan(id: string, formData: FormData) {
  const session = await auth();
  getUserId(session);

  const file = formData.get("scan") as File | null;
  if (!file || file.size === 0) throw new Error("Keine Datei ausgewählt");

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Nur JPG, PNG, WebP oder PDF erlaubt");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Datei darf maximal 10 MB groß sein");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await prisma.aitDeliveryNote.update({
    where: { id },
    data: { signedScanData: buffer, signedScanMime: file.type },
  });

  revalidatePath("/ait/warenanmeldung");
}
