// 脉络数据接口 — 读写某个案的脉络摘要

import { 读取脉络, 保存脉络 } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  return Response.json({ summary: 读取脉络(caseId) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const { summary } = await request.json();
  保存脉络(caseId, summary || "");
  return Response.json({ ok: true });
}
