import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/auth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Credenciales" }, { status: 401 });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Credenciales" }, { status: 401 });

  const token = await signSession({ uid: user.id, role: user.role, email: user.email });
  const res = NextResponse.json({ ok: true, user: { email: user.email, role: user.role } });
  res.cookies.set({ name: "session", value: token, httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  return res;
}
