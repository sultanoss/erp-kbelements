import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET(_req: Request, { params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const img = await prisma.itemImage.findUnique({ where: { sku } });
  if (!img) return new Response(null, { status: 404 });
  return new Response(img.data, {
    headers: { "Content-Type": img.contentType, "Cache-Control": "public, max-age=31536000" },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ sku: string }> }) {
  await requireAdmin();
  const { sku } = await params;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  await prisma.itemImage.upsert({
    where: { sku },
    create: { sku, data: buffer, contentType },
    update: { data: buffer, contentType },
  });
  await prisma.item.update({ where: { sku }, data: { imageUrl: `/api/items/${sku}/image` } });

  return Response.json({ url: `/api/items/${sku}/image` });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ sku: string }> }) {
  await requireAdmin();
  const { sku } = await params;
  await prisma.itemImage.deleteMany({ where: { sku } });
  await prisma.item.update({ where: { sku }, data: { imageUrl: null } });
  return Response.json({ ok: true });
}
