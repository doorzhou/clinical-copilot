// 个案列表接口 — 列出、新建个案

import { 读取个案列表, 保存个案列表 } from "@/lib/data";

export async function GET() {
  return Response.json(读取个案列表());
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return Response.json({ error: "名称不能为空" }, { status: 400 });
  }

  const 新个案 = {
    id: `case_${Date.now()}`,
    name: name.trim(),
    createdAt: Date.now(),
  };

  const 列表 = 读取个案列表();
  列表.unshift(新个案);
  保存个案列表(列表);

  return Response.json(新个案);
}
