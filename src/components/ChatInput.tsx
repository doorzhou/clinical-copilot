// 输入框 — 多行、Enter 发送、Shift+Enter 换行

"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface 输入框属性 {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: 输入框属性) {
  const [文本, set文本] = useState("");
  const 输入框引用 = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (输入框引用.current) {
      输入框引用.current.style.height = "auto";
      输入框引用.current.style.height = `${Math.min(输入框引用.current.scrollHeight, 160)}px`;
    }
  }, [文本]);

  const 提交 = () => {
    const 内容 = 文本.trim();
    if (!内容 || disabled) return;
    onSend(内容);
    set文本("");
  };

  const 键盘事件 = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      提交();
    }
  };

  return (
    <div
      className="flex items-end gap-3 px-5 py-4"
      style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}
    >
      <textarea
        ref={输入框引用}
        value={文本}
        onChange={(e) => set文本(e.target.value)}
        onKeyDown={键盘事件}
        placeholder="聊聊你的个案..."
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-xl px-4 py-3 text-[14px] leading-[1.6] outline-none transition-colors disabled:opacity-40"
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />
      <button
        onClick={提交}
        disabled={disabled || !文本.trim()}
        className="flex shrink-0 items-center justify-center rounded-xl h-[46px] w-[46px] transition-all disabled:opacity-20"
        style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
        onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--accent-hover)"; }}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 10L17 3L10 17L9 11L3 10Z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
