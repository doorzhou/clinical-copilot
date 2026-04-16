// 主应用 — 三栏布局：个案列表 | 对话 | 信息面板

"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar, { 个案 } from "./Sidebar";
import Chat from "./Chat";
import ProfilePanel from "./ProfilePanel";
import SettingsModal from "./SettingsModal";
import CalendarModal from "./CalendarModal";

export default function App() {
  const [个案列表, set个案列表] = useState<个案[]>([]);
  const [当前个案Id, set当前个案Id] = useState<string | null>(null);
  const [面板可见, set面板可见] = useState(false);
  const [设置可见, set设置可见] = useState(false);
  const [日历可见, set日历可见] = useState(false);
  const [加载中, set加载中] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((列表: 个案[]) => {
        set个案列表(列表);
        if (列表.length > 0) set当前个案Id(列表[0].id);
      })
      .finally(() => set加载中(false));
  }, []);

  const 新建个案 = useCallback(async (name: string) => {
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const 新个案: 个案 = await res.json();
    set个案列表((prev) => [新个案, ...prev]);
    set当前个案Id(新个案.id);
  }, []);

  const 删除个案 = useCallback(async (id: string) => {
    await fetch(`/api/cases/${id}`, { method: "DELETE" });
    set个案列表((prev) => {
      const 新列表 = prev.filter((c) => c.id !== id);
      set当前个案Id((当前) =>
        当前 === id ? (新列表.length > 0 ? 新列表[0].id : null) : 当前
      );
      return 新列表;
    });
  }, []);

  const 重命名个案 = useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const 更新个案: 个案 = await res.json();
    set个案列表((prev) => prev.map((c) => (c.id === id ? 更新个案 : c)));
  }, []);

  const 当前个案 = 个案列表.find((c) => c.id === 当前个案Id);

  if (加载中) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ color: "var(--text-tertiary)" }}>
        <div className="text-[14px]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* 左栏：个案列表 */}
      <Sidebar
        个案列表={个案列表}
        当前个案Id={当前个案Id}
        on选择={set当前个案Id}
        on新建={新建个案}
        on删除={删除个案}
        on重命名={重命名个案}
        on日历={() => set日历可见(true)}
        on设置={() => set设置可见(true)}
      />

      {/* 中栏：对话 */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏 */}
        <header
          className="flex shrink-0 items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}
        >
          <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {当前个案 ? 当前个案.name : "临床搭档"}
          </span>
          {当前个案Id && (
            <button
              onClick={() => set面板可见(!面板可见)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors"
              style={{
                background: 面板可见 ? "var(--accent-light)" : "transparent",
                color: 面板可见 ? "var(--accent)" : "var(--text-tertiary)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <line x1="11" y1="2" x2="11" y2="14" />
              </svg>
              个案信息
            </button>
          )}
        </header>
        <Chat 个案Id={当前个案Id} 个案名称={当前个案?.name || null} />
      </main>

      {/* 右栏：信息面板（非覆盖，推拉式） */}
      <div
        className="shrink-0 overflow-hidden transition-all"
        style={{
          width: 面板可见 ? 360 : 0,
          borderLeft: 面板可见 ? "1px solid var(--border)" : "none",
          transitionDuration: "var(--transition-normal)",
        }}
      >
        <ProfilePanel
          个案Id={当前个案Id}
          个案名称={当前个案?.name || null}
          onClose={() => set面板可见(false)}
        />
      </div>

      {/* 设置弹窗 */}
      {设置可见 && <SettingsModal onClose={() => set设置可见(false)} />}

      {/* 日程弹窗 */}
      {日历可见 && <CalendarModal onClose={() => set日历可见(false)} 个案列表={个案列表} />}
    </div>
  );
}
