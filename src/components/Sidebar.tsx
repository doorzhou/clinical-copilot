// 侧边栏 — 来访者列表，支持新建、切换、右键菜单（重命名、查看详情、删除）

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface 个案 {
  id: string;
  name: string;
  createdAt: number;
}

interface 右键菜单 {
  x: number;
  y: number;
  个案: 个案;
}

interface 侧边栏属性 {
  个案列表: 个案[];
  当前个案Id: string | null;
  on选择: (id: string) => void;
  on新建: (name: string) => void;
  on删除: (id: string) => void;
  on重命名: (id: string, name: string) => void;
  on日历: () => void;
  on设置: () => void;
}

export default function Sidebar({
  个案列表,
  当前个案Id,
  on选择,
  on新建,
  on删除,
  on重命名,
  on日历,
  on设置,
}: 侧边栏属性) {
  const [正在新建, set正在新建] = useState(false);
  const [新名称, set新名称] = useState("");
  const [确认删除Id, set确认删除Id] = useState<string | null>(null);
  const [右键菜单, set右键菜单] = useState<右键菜单 | null>(null);
  const [重命名中, set重命名中] = useState<string | null>(null);
  const [重命名输入, set重命名输入] = useState("");
  const [详情卡片, set详情卡片] = useState<个案 | null>(null);
  const [详情数据, set详情数据] = useState<{ 对话数: number; 文件数: number; 最后活跃: string } | null>(null);
  const 菜单Ref = useRef<HTMLDivElement>(null);

  const 提交新建 = () => {
    const name = 新名称.trim();
    if (!name) return;
    on新建(name);
    set新名称("");
    set正在新建(false);
  };

  // 点击其他区域关闭菜单和卡片
  useEffect(() => {
    const 关闭 = (e: MouseEvent) => {
      if (菜单Ref.current && !菜单Ref.current.contains(e.target as Node)) {
        set右键菜单(null);
      }
      if (详情卡片 && !(e.target as HTMLElement).closest('[data-detail-card]')) {
        set详情卡片(null);
      }
    };
    document.addEventListener("mousedown", 关闭);
    return () => document.removeEventListener("mousedown", 关闭);
  }, [详情卡片]);

  const 加载详情 = useCallback(async (c: 个案) => {
    set详情卡片(c);
    set详情数据(null);
    try {
      const [chatRes, filesRes] = await Promise.all([
        fetch(`/api/cases/${c.id}/chat`),
        fetch(`/api/cases/${c.id}/files`),
      ]);
      const chat = await chatRes.json();
      const files = await filesRes.json();
      const 最后消息 = Array.isArray(chat) && chat.length > 0 ? chat[chat.length - 1] : null;
      set详情数据({
        对话数: Array.isArray(chat) ? chat.length : 0,
        文件数: Array.isArray(files) ? files.length : 0,
        最后活跃: 最后消息
          ? new Date().toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
          : new Date(c.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
      });
    } catch {
      set详情数据({ 对话数: 0, 文件数: 0, 最后活跃: "—" });
    }
  }, []);

  const 执行重命名 = (id: string) => {
    const name = 重命名输入.trim();
    if (name) on重命名(id, name);
    set重命名中(null);
  };

  const 右键操作 = (action: string, c: 个案) => {
    set右键菜单(null);
    switch (action) {
      case "rename":
        set重命名中(c.id);
        set重命名输入(c.name);
        break;
      case "detail":
        加载详情(c);
        break;
      case "delete":
        set确认删除Id(c.id);
        break;
    }
  };

  return (
    <div
      className="flex h-full w-60 shrink-0 flex-col"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* 标题 + 新建 */}
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-[13px] font-semibold tracking-wide" style={{ color: "var(--text-secondary)" }}>
          来访者
        </span>
        <button
          onClick={() => set正在新建(true)}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
          style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
        >
          + 新建
        </button>
      </div>

      {/* 新建输入 */}
      {正在新建 && (
        <div className="px-3 pb-3">
          <input
            autoFocus
            value={新名称}
            onChange={(e) => set新名称(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") 提交新建();
              if (e.key === "Escape") set正在新建(false);
            }}
            placeholder="输入代号，如 A 先生"
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={提交新建}
              disabled={!新名称.trim()}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all disabled:opacity-30"
              style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
            >
              确定
            </button>
            <button
              onClick={() => set正在新建(false)}
              className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 分割线 */}
      <div style={{ borderBottom: "1px solid var(--border)" }} />

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {个案列表.length === 0 && !正在新建 && (
          <p className="px-3 py-8 text-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            还没有来访者
          </p>
        )}
        {个案列表.map((c) => {
          const 选中 = 当前个案Id === c.id;
          return (
            <div key={c.id}>
              <div
                onClick={() => !重命名中 && on选择(c.id)}
                className="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-all"
                style={{
                  background: 选中 ? "var(--bg-active)" : "transparent",
                  color: 选中 ? "var(--text-inverse)" : "var(--text-primary)",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => { if (!选中) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!选中) e.currentTarget.style.background = "transparent"; }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  set右键菜单({ x: e.clientX, y: e.clientY, 个案: c });
                }}
              >
                {重命名中 === c.id ? (
                  <input
                    autoFocus
                    value={重命名输入}
                    onChange={(e) => set重命名输入(e.target.value)}
                    onBlur={() => 执行重命名(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") 执行重命名(c.id);
                      if (e.key === "Escape") set重命名中(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded px-1.5 py-0.5 text-[13px] outline-none"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--accent)", color: "var(--text-primary)" }}
                  />
                ) : (
                  <>
                    <span className="truncate font-medium">{c.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        set确认删除Id(确认删除Id === c.id ? null : c.id);
                      }}
                      className="shrink-0 rounded px-1.5 text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: 选中 ? "rgba(255,255,255,0.5)" : "var(--text-tertiary)" }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              {确认删除Id === c.id && (
                <div
                  className="mx-1 mb-1 flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "var(--danger-light)" }}
                >
                  <span className="flex-1 text-[12px]" style={{ color: "var(--danger)" }}>确认删除？</span>
                  <button
                    onClick={() => { on删除(c.id); set确认删除Id(null); }}
                    className="rounded px-2 py-0.5 text-[12px] font-medium"
                    style={{ color: "var(--danger)" }}
                  >
                    删除
                  </button>
                  <button
                    onClick={() => set确认删除Id(null)}
                    className="rounded px-2 py-0.5 text-[12px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部：日历 + 设置 */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={on日历}
          className="flex w-full items-center gap-2 px-4 py-3 text-[12px] transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="12" height="11" rx="2" />
            <line x1="2" y1="7" x2="14" y2="7" />
            <line x1="5" y1="1" x2="5" y2="4" />
            <line x1="11" y1="1" x2="11" y2="4" />
          </svg>
          日程
        </button>
        <button
          onClick={on设置}
          className="flex w-full items-center gap-2 px-4 py-3 text-[12px] transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M13.1 10a1.2 1.2 0 0 0 .24 1.32l.04.04a1.45 1.45 0 1 1-2.06 2.06l-.04-.04a1.2 1.2 0 0 0-1.32-.24 1.2 1.2 0 0 0-.73 1.1v.12a1.45 1.45 0 0 1-2.9 0v-.06a1.2 1.2 0 0 0-.79-1.1 1.2 1.2 0 0 0-1.32.24l-.04.04a1.45 1.45 0 1 1-2.06-2.06l.04-.04a1.2 1.2 0 0 0 .24-1.32 1.2 1.2 0 0 0-1.1-.73h-.12a1.45 1.45 0 0 1 0-2.9h.06a1.2 1.2 0 0 0 1.1-.79 1.2 1.2 0 0 0-.24-1.32l-.04-.04a1.45 1.45 0 1 1 2.06-2.06l.04.04a1.2 1.2 0 0 0 1.32.24h.06a1.2 1.2 0 0 0 .73-1.1v-.12a1.45 1.45 0 0 1 2.9 0v.06a1.2 1.2 0 0 0 .73 1.1 1.2 1.2 0 0 0 1.32-.24l.04-.04a1.45 1.45 0 1 1 2.06 2.06l-.04.04a1.2 1.2 0 0 0-.24 1.32v.06a1.2 1.2 0 0 0 1.1.73h.12a1.45 1.45 0 0 1 0 2.9h-.06a1.2 1.2 0 0 0-1.1.73z" />
          </svg>
          设置
        </button>
      </div>

      {/* 右键菜单 */}
      {右键菜单 && (
        <div
          ref={菜单Ref}
          className="fixed inset-0 z-50"
          style={{ left: 0, top: 0 }}
        >
          <div className="absolute inset-0" onClick={() => set右键菜单(null)} />
          <div
            className="absolute rounded-lg py-1"
            style={{
              left: Math.min(右键菜单.x, window.innerWidth - 160),
              top: Math.min(右键菜单.y, window.innerHeight - 180),
              background: "var(--bg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              minWidth: 140,
            }}
          >
            {([
              { key: "rename", label: "重命名" },
              { key: "detail", label: "查看详情" },
              { key: "divider" as const },
              { key: "delete", label: "删除", danger: true },
            ] as const).map((item) =>
              item.key === "divider" ? (
                <div key="divider" className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
              ) : (
                <button
                  key={item.key}
                  onClick={() => 右键操作(item.key, 右键菜单.个案)}
                  className="block w-full px-3 py-1.5 text-left text-[12px] transition-colors"
                  style={{
                    color: "danger" in item && item.danger ? "var(--danger)" : "var(--text-primary)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 详情卡片 */}
      {详情卡片 && (
        <div
          data-detail-card
          className="fixed z-40 rounded-xl p-4"
          style={{
            left: Math.min(200, window.innerWidth - 280),
            top: Math.max(80, (window.innerHeight - 200) / 2),
            width: 260,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
              {详情卡片.name}
            </span>
            <button
              onClick={() => set详情卡片(null)}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span style={{ color: "var(--text-tertiary)" }}>创建时间</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {new Date(详情卡片.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div
              className="pt-2"
              style={{ borderTop: "1px solid var(--border)" }}
            />
            {详情数据 ? (
              <>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-tertiary)" }}>对话轮数</span>
                  <span style={{ color: "var(--text-secondary)" }}>{Math.ceil(详情数据.对话数 / 2)} 轮</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-tertiary)" }}>文件数量</span>
                  <span style={{ color: "var(--text-secondary)" }}>{详情数据.文件数} 个</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-tertiary)" }}>最后活跃</span>
                  <span style={{ color: "var(--text-secondary)" }}>{详情数据.最后活跃}</span>
                </div>
              </>
            ) : (
              <div className="py-1 text-center" style={{ color: "var(--text-tertiary)" }}>加载中...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
