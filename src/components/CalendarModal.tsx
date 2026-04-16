// 日历弹窗 — 月历视图 + 日期详情，支持日程增删改

"use client";

import { useState, useEffect, useCallback } from "react";

interface 日程 {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  caseId: string | null;
  notes: string;
}

interface 个案选项 {
  id: string;
  name: string;
}

interface 弹窗属性 {
  onClose: () => void;
  个案列表: 个案选项[];
}

const 星期标签 = ["一", "二", "三", "四", "五", "六", "日"];

function 生成月历(年: number, 月: number): (number | null)[][] {
  const 第一天 = new Date(年, 月 - 1, 1);
  const 起始星期 = (第一天.getDay() + 6) % 7; // 周一=0
  const 当月天数 = new Date(年, 月, 0).getDate();
  const 行: (number | null)[][] = [];
  let 当前 = 1 - 起始星期;
  while (当前 <= 当月天数) {
    const 行数据: (number | null)[] = [];
    for (let i = 0; i < 7; i++) {
      行数据.push(当前 >= 1 && 当前 <= 当月天数 ? 当前 : null);
      当前++;
    }
    行.push(行数据);
  }
  return 行;
}

function 日期字符串(年: number, 月: number, 日: number): string {
  return `${年}-${String(月).padStart(2, "0")}-${String(日).padStart(2, "0")}`;
}

function 格式化月份(年: number, 月: number): string {
  return `${年} 年 ${月} 月`;
}

function 格式化日期标题(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const 星期 = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${星期}`;
}

const 今天 = new Date();
const 今天字符串 = 日期字符串(今天.getFullYear(), 今天.getMonth() + 1, 今天.getDate());

export default function CalendarModal({ onClose, 个案列表 }: 弹窗属性) {
  const 当前月 = new Date().getMonth() + 1;
  const 当前年 = new Date().getFullYear();
  const [年, set年] = useState(当前年);
  const [月, set月] = useState(当前月);
  const [选中日期, set选中日期] = useState<string | null>(null);
  const [日程列表, set日程列表] = useState<日程[]>([]);
  const [显示表单, set显示表单] = useState(false);
  const [编辑中, set编辑中] = useState<日程 | null>(null);
  const [表单, set表单] = useState({ title: "", date: "", startTime: "10:00", endTime: "11:00", caseId: "", notes: "" });

  const 加载日程 = useCallback(async () => {
    const monthStr = `${年}-${String(月).padStart(2, "0")}`;
    const res = await fetch(`/api/calendar?month=${monthStr}`);
    const data = await res.json();
    set日程列表(data);
  }, [年, 月]);

  useEffect(() => {
    加载日程();
  }, [加载日程]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const 月份前进 = () => {
    if (月 === 12) { set年(年 + 1); set月(1); }
    else set月(月 + 1);
    set选中日期(null);
  };

  const 月份后退 = () => {
    if (月 === 1) { set年(年 - 1); set月(12); }
    else set月(月 - 1);
    set选中日期(null);
  };

  const 当天日程 = 选中日期
    ? 日程列表.filter((e) => e.date === 选中日期).sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

  const 有日程的日期 = new Set(日程列表.map((e) => e.date));

  const 打开新建 = (dateStr?: string) => {
    set编辑中(null);
    set表单({
      title: "",
      date: dateStr || 选中日期 || 日期字符串(年, 月, new Date().getDate()),
      startTime: "10:00",
      endTime: "11:00",
      caseId: "",
      notes: "",
    });
    set显示表单(true);
  };

  const 打开编辑 = (evt: 日程) => {
    set编辑中(evt);
    set表单({
      title: evt.title,
      date: evt.date,
      startTime: evt.startTime,
      endTime: evt.endTime,
      caseId: evt.caseId || "",
      notes: evt.notes,
    });
    set显示表单(true);
  };

  const 提交表单 = async () => {
    if (!表单.title.trim() || !表单.startTime || !表单.endTime) return;

    if (编辑中) {
      await fetch(`/api/calendar/${编辑中.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(表单),
      });
    } else {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(表单),
      });
    }

    set显示表单(false);
    set编辑中(null);
    加载日程();
  };

  const 删除日程 = async (id: string) => {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    加载日程();
  };

  const 关联名称 = (caseId: string | null) => {
    if (!caseId) return null;
    return 个案列表.find((c) => c.id === caseId)?.name || null;
  };

  const 月历网格 = 生成月历(年, 月);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} onClick={onClose} />

      {/* 弹窗主体 */}
      <div
        className="relative z-10 flex w-full max-w-3xl flex-col rounded-2xl"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-lg)", maxHeight: "80vh" }}
      >
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>日程</span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        {/* 内容区：左月历 + 右详情 */}
        <div className="flex min-h-0 flex-1">
          {/* 左侧：月历 */}
          <div className="flex shrink-0 flex-col" style={{ width: 320, borderRight: "1px solid var(--border)" }}>
            {/* 月份导航 */}
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={月份后退}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="10,3 5,8 10,13" />
                </svg>
              </button>
              <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                {格式化月份(年, 月)}
              </span>
              <button
                onClick={月份前进}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6,3 11,8 6,13" />
                </svg>
              </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 px-2">
              {星期标签.map((d) => (
                <div key={d} className="py-1 text-center text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid flex-1 grid-cols-7 gap-0.5 px-2 pb-3">
              {月历网格.flat().map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const dateStr = 日期字符串(年, 月, day);
                const 是今天 = dateStr === 今天字符串;
                const 是选中 = dateStr === 选中日期;
                const 有日程 = 有日程的日期.has(dateStr);

                return (
                  <button
                    key={dateStr}
                    onClick={() => set选中日期(dateStr)}
                    className="relative flex h-9 flex-col items-center justify-center rounded-lg text-[12px] transition-colors"
                    style={{
                      background: 是选中 ? "var(--accent)" : 是今天 ? "var(--accent-light)" : "transparent",
                      color: 是选中 ? "var(--text-inverse)" : "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => { if (!是选中 && !是今天) e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { if (!是选中 && !是今天) e.currentTarget.style.background = "transparent"; }}
                  >
                    {day}
                    {有日程 && (
                      <div
                        className="absolute bottom-1 h-1 w-1 rounded-full"
                        style={{ background: 是选中 ? "var(--text-inverse)" : "var(--accent)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右侧：日期详情 */}
          <div className="flex min-w-0 flex-1 flex-col">
            {选中日期 ? (
              <>
                {/* 日期标题 */}
                <div className="flex shrink-0 items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                    {格式化日期标题(选中日期)}
                  </span>
                  {!显示表单 && (
                    <button
                      onClick={() => 打开新建(选中日期)}
                      className="rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors"
                      style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}
                    >
                      + 添加
                    </button>
                  )}
                </div>

                {/* 日程列表或表单 */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {显示表单 ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[11px]" style={{ color: "var(--text-tertiary)" }}>标题</label>
                        <input
                          autoFocus
                          value={表单.title}
                          onChange={(e) => set表单({ ...表单, title: e.target.value })}
                          placeholder="如：A 先生咨询"
                          className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-[11px]" style={{ color: "var(--text-tertiary)" }}>开始时间</label>
                          <input
                            type="time"
                            value={表单.startTime}
                            onChange={(e) => set表单({ ...表单, startTime: e.target.value })}
                            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-[11px]" style={{ color: "var(--text-tertiary)" }}>结束时间</label>
                          <input
                            type="time"
                            value={表单.endTime}
                            onChange={(e) => set表单({ ...表单, endTime: e.target.value })}
                            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px]" style={{ color: "var(--text-tertiary)" }}>关联来访者（可选）</label>
                        <select
                          value={表单.caseId}
                          onChange={(e) => set表单({ ...表单, caseId: e.target.value })}
                          className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        >
                          <option value="">无</option>
                          {个案列表.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px]" style={{ color: "var(--text-tertiary)" }}>备注</label>
                        <textarea
                          value={表单.notes}
                          onChange={(e) => set表单({ ...表单, notes: e.target.value })}
                          rows={3}
                          placeholder="可选备注"
                          className="w-full resize-none rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={提交表单}
                          disabled={!表单.title.trim()}
                          className="flex-1 rounded-lg py-2 text-[12px] font-medium transition-all disabled:opacity-30"
                          style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
                        >
                          {编辑中 ? "保存修改" : "创建日程"}
                        </button>
                        <button
                          onClick={() => { set显示表单(false); set编辑中(null); }}
                          className="rounded-lg px-4 py-2 text-[12px] transition-colors"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : 当天日程.length === 0 ? (
                    <div className="flex h-24 items-center justify-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                      这天没有安排
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {当天日程.map((evt) => {
                        const 个案名 = 关联名称(evt.caseId);
                        return (
                          <div
                            key={evt.id}
                            className="group rounded-lg px-3 py-2.5 transition-colors"
                            style={{ background: "var(--bg-subtle)" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-subtle)"}
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>
                                    {evt.startTime} - {evt.endTime}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                                  {evt.title}
                                </div>
                                {个案名 && (
                                  <div className="mt-0.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                                    关联：{个案名}
                                  </div>
                                )}
                                {evt.notes && (
                                  <div className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                    {evt.notes}
                                  </div>
                                )}
                              </div>
                              <div className="ml-2 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => 打开编辑(evt)}
                                  className="rounded px-1.5 py-0.5 text-[11px] transition-colors"
                                  style={{ color: "var(--text-tertiary)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => 删除日程(evt.id)}
                                  className="rounded px-1.5 py-0.5 text-[11px] transition-colors"
                                  style={{ color: "var(--text-tertiary)" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-[28px]" style={{ color: "var(--text-tertiary)" }}>
                    <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                      <rect x="2" y="3" width="12" height="11" rx="2" />
                      <line x1="2" y1="7" x2="14" y2="7" />
                      <line x1="5" y1="1" x2="5" y2="4" />
                      <line x1="11" y1="1" x2="11" y2="4" />
                    </svg>
                  </div>
                  <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>选择一个日期查看安排</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
