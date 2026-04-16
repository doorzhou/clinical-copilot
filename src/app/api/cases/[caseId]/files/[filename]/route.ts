// 单文件接口 — 读取、删除个案附属文件

import { 读取个案文件, 删除个案文件 } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; filename: string }> }
) {
  const { caseId, filename } = await params;
  try {
    const 内容 = 读取个案文件(caseId, filename);
    return new Response(内容, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return Response.json({ error: "文件不存在" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; filename: string }> }
) {
  const { caseId, filename } = await params;
  删除个案文件(caseId, filename);
  return Response.json({ ok: true });
}
