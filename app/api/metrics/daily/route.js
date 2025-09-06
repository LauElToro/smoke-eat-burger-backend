import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  const where = since ? { createdAt: { gte: new Date(since) } } : {};
  const orders = await prisma.order.findMany({ where });
  const expenses = await prisma.expense.findMany({ where });

  const revenue = orders.reduce((a,o) => a + Number(o.total), 0);
  const cogs = orders.reduce((a,o) => a + Number(o.cogs), 0);
  const gross = orders.reduce((a,o) => a + Number(o.grossProfit), 0);
  const opex = expenses.reduce((a,e) => a + Number(e.amount), 0);
  const net = gross - opex;

  return NextResponse.json({
    revenue, cogs, grossProfit: gross, expenses: opex, netProfit: net,
    orders: orders.length
  });
}
