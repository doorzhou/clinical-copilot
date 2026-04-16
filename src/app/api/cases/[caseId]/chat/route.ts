// 对话数据接口 — 读写某个案的对话历史

import { 读取对话, 保存对话 } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  return Response.json(读取对话(caseId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const messages = await request.json();
  保存对话(caseId, messages);
  return Response.json({ ok: true });
}
