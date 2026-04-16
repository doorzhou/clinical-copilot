// 文件浏览器 — 展示个案关联的文件，支持新建、查看、编辑、删除

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface 文件信息 {
  name: string;
  size: number;
  modifiedAt: number;
}

interface 右键菜单 {
  x: number;
  y: number;
  fileName: string;
}

interface 浏览器属性 {
  个案Id: string | null;
}

function 格式化大小(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function 格式化时间(ms: number): string {
  return new Date(ms).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FileBrowser({ 个案Id }: 浏览器属性) {
  const [文件列表, set文件列表] = useState<文件信息[]>([]);
  const [查看内容, set查看内容] = useState<{ name: string; content: string } | null>(null);
  const [编辑模式, set编辑模式] = useState(false);
  const [编辑内容, set编辑内容] = useState("");
  const [确认删除, set确认删除] = useState<string | null>(null);
  const [正在新建, set正在新建] = useState(false);
  const [新文件名, set新文件名] = useState("");
  const [新文件内容, set新文件内容] = useState("");
  const [右键菜单, set右键菜单] = useState<右键菜单 | null>(null);
  const [重命名中, set重命名中] = useState<string | null>(null);
  const [重命名输入, set重命名输入] = useState("");
  const 菜单Ref = useRef<HTMLDivElement>(null);

  const 刷新列表 = useCallback(() => {
    if (!个案Id) return;
    fetch(`/api/cases/${个案Id}/files`)
      .then((r) => r.json())
      .then((data) => set文件列表(data))
      .catch(() => set文件列表([]));
  }, [个案Id]);

  useEffect(() => {
    刷新列表();
  }, [刷新列表]);

  // 点击其他区域关闭右键菜单
  useEffect(() => {
    const 关闭 = (e: MouseEvent) => {
      if (菜单Ref.current && !菜单Ref.current.contains(e.target as Node)) {
        set右键菜单(null);
      }
    };
    if (右键菜单) document.addEventListener("mousedown", 关闭);
    return () => document.removeEventListener("mousedown", 关闭);
  }, [右键菜单]);

  const 查看文件 = async (name: string) => {
    if (!个案Id) return;
    const res = await fetch(`/api/cases/${个案Id}/files/${encodeURIComponent(name)}`);
    if (res.ok) {
      const content = await res.text();
      set查看内容({ name, content });
      set编辑模式(false);
      set编辑内容(content);
    }
  };

  const 保存文件 = async () => {
    if (!个案Id || !查看内容) return;
    await fetch(`/api/cases/${个案Id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: 查看内容.name, content: 编辑内容 }),
    });
    set查看内容({ name: 查看内容.name, content: 编辑内容 });
    set编辑模式(false);
    刷新列表();
  };

  const 创建文件 = async () => {
    if (!个案Id || !新文件名.trim()) return;
    await fetch(`/api/cases/${个案Id}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: 新文件名.trim(), content: 新文件内容 }),
    });
    set正在新建(false);
    set新文件名("");
    set新文件内容("");
    刷新列表();
  };

  const 删除文件 = async (name: string) => {
    if (!个案Id) return;
    await fetch(`/api/cases/${个案Id}/files/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    set确认删除(null);
    set右键菜单(null);
    刷新列表();
  };

  const 重命名文件 = async (oldName: string) => {
    if (!个案Id || !重命名输入.trim() || 重命名输入.trim() === oldName) {
      set重命名中(null);
      return;
    }
    // 先读取内容，再用新名字创建，最后删除旧文件
    const res = await fetch(`/api/cases/${个案Id}/files/${encodeURIComponent(oldName)}`);
    if (res.ok) {
      const content = await res.text();
      await fetch(`/api/cases/${个案Id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: 重命名输入.trim(), content }),
      });
      await fetch(`/api/cases/${个案Id}/files/${encodeURIComponent(oldName)}`, { method: "DELETE" });
    }
    set重命名中(null);
    set右键菜单(null);
    刷新列表();
  };

  const 右键操作 = useCallback(async (action: string, fileName: string) => {
    set右键菜单(null);
    if (!个案Id) return;

    switch (action) {
      case "insert": {
        // 插入到聊天：读取文件内容，复制到剪贴板
        const res = await fetch(`/api/cases/${个案Id}/files/${encodeURIComponent(fileName)}`);
        if (res.ok) {
          const content = await res.text();
          await navigator.clipboard.writeText(content);
        }
        break;
      }
      case "path": {
        await navigator.clipboard.writeText(`/cases/${个案Id}/files/${fileName}`);
        break;
      }
      case "copy": {
        const res = await fetch(`/api/cases/${个案Id}/files/${encodeURIComponent(fileName)}`);
        if (res.ok) {
          const content = await res.text();
          await navigator.clipboard.writeText(content);
        }
        break;
      }
      case "rename": {
        set重命名中(fileName);
        set重命名输入(fileName);
        break;
      }
      case "delete": {
        set确认删除(fileName);
        break;
      }
    }
  }, [个案Id]);

  if (!个案Id) {
    return (
      <div className="flex h-32 items-center justify-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
        选择一个来访者查看文件
      </div>
    );
  }

  // 新建文件界面
  if (正在新建) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>新建文件</span>
          <button
            onClick={() => { set正在新建(false); set新文件名(""); set新文件内容(""); }}
            className="rounded px-2 py-0.5 text-[12px] transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            取消
          </button>
        </div>
        <input
          autoFocus
          value={新文件名}
          onChange={(e) => set新文件名(e.target.value)}
          placeholder="文件名（如 正念练习.md）"
          className="w-full rounded-lg px-3 py-2 text-[12px] outline-none transition-colors"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <textarea
          value={新文件内容}
          onChange={(e) => set新文件内容(e.target.value)}
          placeholder="文件内容（可以留空）"
          rows={8}
          className="w-full resize-none rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none transition-colors"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button
          onClick={创建文件}
          disabled={!新文件名.trim()}
          className="w-full rounded-lg px-3 py-2 text-[12px] font-medium transition-all disabled:opacity-30"
          style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
        >
          创建
        </button>
      </div>
    );
  }

  // 查看/编辑文件内容
  if (查看内容) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{查看内容.name}</span>
          <div className="flex gap-1.5">
            {编辑模式 ? (
              <>
                <button
                  onClick={保存文件}
                  className="rounded px-2 py-0.5 text-[12px] font-medium transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  保存
                </button>
                <button
                  onClick={() => { set编辑模式(false); set编辑内容(查看内容.content); }}
                  className="rounded px-2 py-0.5 text-[12px] transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={() => set编辑模式(true)}
                className="rounded px-2 py-0.5 text-[12px] transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                编辑
              </button>
            )}
            <button
              onClick={() => { set查看内容(null); set编辑模式(false); }}
              className="rounded px-2 py-0.5 text-[12px] transition-colors"
              style={{ color: "var(--text-tertiary)" }}
            >
              返回
            </button>
          </div>
        </div>
        {编辑模式 ? (
          <textarea
            value={编辑内容}
            onChange={(e) => set编辑内容(e.target.value)}
            rows={14}
            className="w-full resize-none rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none transition-colors"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        ) : (
          <pre
            className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg p-3 text-[12px] leading-relaxed"
            style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}
          >
            {查看内容.content}
          </pre>
        )}
      </div>
    );
  }

  // 文件列表
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          {文件列表.length > 0 ? `${文件列表.length} 个文件` : ""}
        </span>
        <button
          onClick={() => set正在新建(true)}
          className="rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors"
          style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
        >
          新建
        </button>
      </div>

      {文件列表.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          暂无文件，点「新建」创建
        </div>
      ) : (
        <div className="space-y-0.5">
          {文件列表.map((f) => (
            <div key={f.name}>
              <div
                className="group flex items-center justify-between rounded-lg px-2 py-2 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onContextMenu={(e) => {
                  e.preventDefault();
                  set右键菜单({ x: e.clientX, y: e.clientY, fileName: f.name });
                }}
              >
                {重命名中 === f.name ? (
                  <input
                    autoFocus
                    value={重命名输入}
                    onChange={(e) => set重命名输入(e.target.value)}
                    onBlur={() => 重命名文件(f.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") 重命名文件(f.name);
                      if (e.key === "Escape") set重命名中(null);
                    }}
                    className="w-full rounded px-1.5 py-0.5 text-[12px] outline-none"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--accent)", color: "var(--text-primary)" }}
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => 查看文件(f.name)}
                      className="block truncate text-[12px] font-medium transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {f.name}
                    </button>
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {格式化大小(f.size)} · {格式化时间(f.modifiedAt)}
                    </span>
                  </div>
                )}
              </div>
              {确认删除 === f.name && (
                <div
                  className="mb-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                  style={{ background: "var(--danger-light)" }}
                >
                  <span className="flex-1 text-[12px]" style={{ color: "var(--danger)" }}>确认删除？</span>
                  <button
                    onClick={() => 删除文件(f.name)}
                    className="rounded px-2 py-0.5 text-[12px] font-medium"
                    style={{ color: "var(--danger)" }}
                  >
                    删除
                  </button>
                  <button
                    onClick={() => set确认删除(null)}
                    className="rounded px-2 py-0.5 text-[12px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 右键菜单 */}
      {右键菜单 && (
        <div
          ref={菜单Ref}
          className="fixed inset-0 z-50"
          style={{ left: 0, top: 0 }}
        >
          {/* 遮罩，点击关闭 */}
          <div className="absolute inset-0" onClick={() => set右键菜单(null)} />
          {/* 菜单本体 */}
          <div
            className="absolute rounded-lg py-1"
            style={{
              left: Math.min(右键菜单.x, window.innerWidth - 180),
              top: Math.min(右键菜单.y, window.innerHeight - 220),
              background: "var(--bg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              minWidth: 160,
            }}
          >
            {[
              { key: "insert", label: "插入到聊天" },
              { key: "path", label: "复制路径" },
              { key: "copy", label: "拷贝" },
              { key: "rename", label: "重命名" },
              { key: "divider" as const },
              { key: "delete", label: "删除", danger: true },
            ].map((item) =>
              item.key === "divider" ? (
                <div key="divider" className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
              ) : (
                <button
                  key={item.key}
                  onClick={() => 右键操作(item.key, 右键菜单.fileName)}
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
    </div>
  );
}
