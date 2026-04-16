// 信息面板 — 右侧常驻栏，三个标签页：个案脉络、咨询师画像、文件管理

"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FileBrowser from "./FileBrowser";

interface 面板属性 {
  个案Id: string | null;
  个案名称: string | null;
  onClose: () => void;
}

type 标签页 = "case" | "counselor" | "files";

export default function ProfilePanel({ 个案Id, 个案名称, onClose }: 面板属性) {
  const [当前标签, set当前标签] = useState<标签页>("case");
  const [个案脉络, set个案脉络] = useState("");
  const [咨询师画像, set咨询师画像] = useState("");

  useEffect(() => {
    if (个案Id) {
      fetch(`/api/cases/${个案Id}/summary`)
        .then((r) => r.json())
        .then((data) => set个案脉络(data.summary || ""))
        .catch(() => set个案脉络(""));
    } else {
      set个案脉络("");
    }
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => set咨询师画像(data.profile || ""))
      .catch(() => set咨询师画像(""));
  }, [个案Id]);

  const 标签列表: { key: 标签页; label: string }[] = [
    { key: "case", label: 个案名称 ? `${个案名称} 的脉络` : "个案脉络" },
    { key: "counselor", label: "咨询师画像" },
    { key: "files", label: "文件" },
  ];

  const proseStyle = {
    "--tw-prose-body": "var(--text-primary)",
    "--tw-prose-headings": "var(--text-primary)",
    "--tw-prose-bold": "var(--text-primary)",
    "--tw-prose-quotes": "var(--text-secondary)",
    "--tw-prose-quote-borders": "var(--border)",
    "--tw-prose-links": "var(--accent)",
  } as React.CSSProperties;

  return (
    <div className="flex h-full w-[360px] flex-col" style={{ background: "var(--bg-surface)" }}>
      {/* 头部 */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>个案信息</span>
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

      {/* 标签切换 */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {标签列表.map((tab) => (
          <button
            key={tab.key}
            onClick={() => set当前标签(tab.key)}
            className="flex-1 py-2.5 text-[12px] font-medium transition-colors"
            style={{
              color: 当前标签 === tab.key ? "var(--accent)" : "var(--text-tertiary)",
              borderBottom: 当前标签 === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {当前标签 === "case" && (
          个案脉络 ? (
            <div
              className="prose prose-sm max-w-none"
              style={proseStyle}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {个案脉络}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              {个案Id ? "还没有积累脉络，聊几轮后自动生成" : "选择一个来访者查看脉络"}
            </div>
          )
        )}

        {当前标签 === "counselor" && (
          咨询师画像 ? (
            <div
              className="prose prose-sm max-w-none"
              style={proseStyle}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {咨询师画像}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              还没有积累画像，多聊几轮后自动生成
            </div>
          )
        )}

        {当前标签 === "files" && (
          <FileBrowser 个案Id={个案Id} />
        )}
      </div>
    </div>
  );
}
