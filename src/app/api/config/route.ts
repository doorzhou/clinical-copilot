// 配置接口 — 读写 API 配置（本地文件）

import { 读取配置, 保存配置 } from "@/lib/data";

export async function GET() {
  return Response.json(读取配置());
}

export async function POST(request: Request) {
  const body = await request.json();
  保存配置({
    api_base_url: body.api_base_url || "",
    api_key: body.api_key || "",
    api_model: body.api_model || "",
  });
  return Response.json({ ok: true });
}
