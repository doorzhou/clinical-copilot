// 日程列表接口 — 获取、创建日程

import { 读取日程列表, 保存日程列表 } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // "YYYY-MM"

  let events = 读取日程列表();
  if (month) {
    events = events.filter((e) => e.date.startsWith(month));
  }

  return Response.json(events);
}

export async function POST(request: Request) {
  const { title, date, startTime, endTime, caseId, notes } = await request.json();

  if (!title?.trim() || !date || !startTime || !endTime) {
    return Response.json({ error: "标题、日期、开始时间和结束时间不能为空" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "日期格式应为 YYYY-MM-DD" }, { status: 400 });
  }

  const 新日程 = {
    id: `evt_${Date.now()}`,
    title: title.trim(),
    date,
    startTime,
    endTime,
    caseId: caseId || null,
    notes: notes?.trim() || "",
  };

  const 列表 = 读取日程列表();
  列表.push(新日程);
  保存日程列表(列表);

  return Response.json(新日程);
}
