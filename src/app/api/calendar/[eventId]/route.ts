// 单个日程接口 — 更新、删除日程

import { 读取日程列表, 保存日程列表 } from "@/lib/data";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const 列表 = 读取日程列表();
  const target = 列表.find((e) => e.id === eventId);
  if (!target) {
    return Response.json({ error: "日程不存在" }, { status: 404 });
  }

  const body = await request.json();
  if (body.title !== undefined) target.title = String(body.title).trim();
  if (body.date !== undefined) target.date = body.date;
  if (body.startTime !== undefined) target.startTime = body.startTime;
  if (body.endTime !== undefined) target.endTime = body.endTime;
  if (body.caseId !== undefined) target.caseId = body.caseId || null;
  if (body.notes !== undefined) target.notes = String(body.notes).trim();

  保存日程列表(列表);

  return Response.json(target);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const 列表 = 读取日程列表();
  const 新列表 = 列表.filter((e) => e.id !== eventId);
  保存日程列表(新列表);

  return Response.json({ ok: true });
}
