// 咨询师画像数据接口 — 读写咨询师画像

import { 读取咨询师画像, 保存咨询师画像 } from "@/lib/data";

export async function GET() {
  return Response.json({ profile: 读取咨询师画像() });
}

export async function POST(request: Request) {
  const { profile } = await request.json();
  保存咨询师画像(profile || "");
  return Response.json({ ok: true });
}
