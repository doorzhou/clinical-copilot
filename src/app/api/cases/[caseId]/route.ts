// 单个案接口 — 重命名、删除个案

import { 读取个案列表, 保存个案列表, 删除个案目录, 校验个案Id } from "@/lib/data";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  校验个案Id(caseId);

  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    return Response.json({ error: "名称不能为空" }, { status: 400 });
  }

  const 列表 = 读取个案列表();
  const target = 列表.find((c) => c.id === caseId);
  if (!target) {
    return Response.json({ error: "个案不存在" }, { status: 404 });
  }

  target.name = name.trim();
  保存个案列表(列表);

  return Response.json(target);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;

  const 列表 = 读取个案列表();
  const 新列表 = 列表.filter((c) => c.id !== caseId);
  保存个案列表(新列表);
  删除个案目录(caseId);

  return Response.json({ ok: true });
}
