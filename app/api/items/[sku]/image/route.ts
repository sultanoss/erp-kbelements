import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

export async function PUT(req: Request, { params }: { params: Promise<{ sku: string }> }) {
  await requireAdmin();
  const { sku } = await params;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  const blob = await put(`items/${sku}`, file, { access: "public", allowOverwrite: true });
  await prisma.item.update({ where: { sku }, data: { imageUrl: blob.url } });
  return Response.json({ url: blob.url });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ sku: string }> }) {
  await requireAdmin();
  const { sku } = await params;
  const item = await prisma.item.findUnique({ where: { sku }, select: { imageUrl: true } });
  if (item?.imageUrl) await del(item.imageUrl);
  await prisma.item.update({ where: { sku }, data: { imageUrl: null } });
  return Response.json({ ok: true });
}
