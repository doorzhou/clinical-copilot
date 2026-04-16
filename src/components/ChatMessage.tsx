// 单条消息 — 用户右对齐深色，搭档左对齐卡片感

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface 消息属性 {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({ role, content, isStreaming }: 消息属性) {
  const 是用户 = role === "user";

  // 思考动画
  if (!是用户 && !content && isStreaming) {
    return (
      <div className="flex justify-start mb-4">
        <div
          className="rounded-2xl px-4 py-3"
          style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-center gap-1">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--accent)",
                  animation: "pulse-dot 1.2s ease-in-out infinite",
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className={`flex ${是用户 ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[75%] text-[14px] leading-[1.7] ${
          是用户 ? "whitespace-pre-wrap rounded-2xl rounded-br-md px-4 py-2.5" : "rounded-2xl rounded-bl-md px-4 py-3"
        }`}
        style={
          是用户
            ? { background: "var(--bg-active)", color: "var(--text-inverse)" }
            : { background: "var(--bg-surface)", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" }
        }
      >
        {是用户 ? (
          content
        ) : (
          <div
            className="prose prose-sm max-w-none"
            style={
              {
                "--tw-prose-body": "var(--text-primary)",
                "--tw-prose-headings": "var(--text-primary)",
                "--tw-prose-bold": "var(--text-primary)",
                "--tw-prose-quotes": "var(--text-secondary)",
                "--tw-prose-quote-borders": "var(--border)",
                "--tw-prose-links": "var(--accent)",
              } as React.CSSProperties
            }
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
