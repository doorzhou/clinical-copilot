// 文件列表接口 — 列出个案的附属文件、新建文件

import { 列出个案文件, 保存个案文件 } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  return Response.json(列出个案文件(caseId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const { filename, content } = await request.json();
  if (!filename) {
    return Response.json({ error: "文件名不能为空" }, { status: 400 });
  }
  保存个案文件(caseId, filename, content || "");
  return Response.json({ ok: true });
}
