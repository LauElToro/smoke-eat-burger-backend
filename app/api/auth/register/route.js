import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  const { email, password, role } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { email, passwordHash, role: role === 'ADMIN' ? 'ADMIN' : 'USER' } });
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    return NextResponse.json({ error: "Email en uso" }, { status: 400 });
  }
}
