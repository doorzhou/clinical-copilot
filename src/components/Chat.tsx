// 主对话区域 — 管理消息列表、调用 API、处理流式响应
// 数据全部通过 API 路由读写本地文件

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

interface 消息 {
  role: "user" | "assistant";
  content: string;
}

interface Chat属性 {
  个案Id: string | null;
  个案名称: string | null;
}

export default function Chat({ 个案Id, 个案名称 }: Chat属性) {
  const [消息列表, set消息列表] = useState<消息[]>([]);
  const [正在回复, set正在回复] = useState(false);
  const [未配置, set未配置] = useState(false);
  const [正在提取脉络, set正在提取脉络] = useState(false);
  const [正在提取画像, set正在提取画像] = useState(false);
  const [工具状态, set工具状态] = useState<string | null>(null);
  const 滚动容器 = useRef<HTMLDivElement>(null);

  // 缓存配置，避免每次发消息都请求
  const 配置缓存 = useRef<{ api_base_url: string; api_key: string; api_model: string } | null>(null);

  // 读取配置（带缓存）
  const 获取配置 = useCallback(async () => {
    if (配置缓存.current) return 配置缓存.current;
    const res = await fetch("/api/config");
    const data = await res.json();
    配置缓存.current = data;
    return data;
  }, []);

  // 切换个案时加载对应的对话历史
  useEffect(() => {
    if (个案Id) {
      fetch(`/api/cases/${个案Id}/chat`)
        .then((r) => r.json())
        .then((data) => set消息列表(data))
        .catch(() => set消息列表([]));
    } else {
      set消息列表([]);
    }
  }, [个案Id]);

  // 检查是否已配置
  useEffect(() => {
    获取配置().then((cfg) => {
      set未配置(!cfg.api_base_url || !cfg.api_key || !cfg.api_model);
    });
  }, [获取配置]);

  // 新消息时自动滚到底部
  useEffect(() => {
    滚动容器.current?.scrollTo({
      top: 滚动容器.current.scrollHeight,
      behavior: "smooth",
    });
  }, [消息列表]);

  // 保存对话到服务端
  const 上次保存的列表 = useRef<消息[]>([]);
  useEffect(() => {
    if (!个案Id || 正在回复) return;
    if (消息列表.length === 0 && 上次保存的列表.current.length === 0) return;
    if (消息列表 !== 上次保存的列表.current) {
      fetch(`/api/cases/${个案Id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(消息列表),
      });
      上次保存的列表.current = 消息列表;
    }
  }, [消息列表, 正在回复, 个案Id]);

  // 提取脉络（对话结束后自动调用）
  const 提取脉络 = useCallback(async (对话: 消息[]) => {
    if (!个案Id) return;
    const cfg = await 获取配置();
    if (!cfg.api_base_url || !cfg.api_key || !cfg.api_model) return;

    set正在提取脉络(true);
    try {
      const 脉络Res = await fetch(`/api/cases/${个案Id}/summary`);
      const { summary: 已有脉络 } = await 脉络Res.json();

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: 对话,
          existingSummary: 已有脉络,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          await fetch(`/api/cases/${个案Id}/summary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ summary: data.summary }),
          });
        }
      }
    } catch (err) {
      console.error("脉络提取失败:", err);
    } finally {
      set正在提取脉络(false);
    }
  }, [个案Id, 获取配置]);

  // 提取咨询师画像（跨个案累积）
  const 提取咨询师画像 = useCallback(async (对话: 消息[]) => {
    const cfg = await 获取配置();
    if (!cfg.api_base_url || !cfg.api_key || !cfg.api_model) return;

    set正在提取画像(true);
    try {
      const 画像Res = await fetch("/api/profile");
      const { profile: 已有画像 } = await 画像Res.json();

      const res = await fetch("/api/counselor-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: 对话,
          existingProfile: 已有画像,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile: data.profile }),
          });
        }
      }
    } catch (err) {
      console.error("咨询师画像提取失败:", err);
    } finally {
      set正在提取画像(false);
    }
  }, [获取配置]);

  const 发送消息 = useCallback(async (text: string) => {
    if (!个案Id) return;

    const cfg = await 获取配置();
    if (!cfg.api_base_url || !cfg.api_key || !cfg.api_model) {
      set未配置(true);
      配置缓存.current = null;
      return;
    }

    const 用户消息: 消息 = { role: "user", content: text };
    const 更新后列表 = [...消息列表, 用户消息];

    set消息列表([...更新后列表, { role: "assistant", content: "" }]);
    set正在回复(true);

    try {
      const API消息 = 更新后列表.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 读取已有脉络和咨询师画像
      const [脉络Res, 画像Res] = await Promise.all([
        fetch(`/api/cases/${个案Id}/summary`),
        fetch("/api/profile"),
      ]);
      const { summary: 脉络 } = await 脉络Res.json();
      const { profile: 画像 } = await 画像Res.json();

      const 响应 = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: API消息,
          caseContext: 脉络 || undefined,
          counselorProfile: 画像 || undefined,
          caseId: 个案Id,
        }),
      });

      if (响应.status === 401) {
        set未配置(true);
        配置缓存.current = null;
        set消息列表(更新后列表);
        return;
      }

      if (!响应.ok) {
        const 错误信息 = await 响应.json().catch(() => null);
        throw new Error(错误信息?.error || `接口错误: ${响应.status}`);
      }

      const reader = 响应.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let 工具动作日志 = "";
      let 搭档回复 = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.toolStatus) {
              工具动作日志 += `> ${parsed.toolStatus}\n`;
              set消息列表([
                ...更新后列表,
                { role: "assistant", content: 工具动作日志 },
              ]);
              continue;
            }
            搭档回复 += parsed.text;
            const 显示内容 = 工具动作日志
              ? 工具动作日志 + "\n---\n\n" + 搭档回复
              : 搭档回复;
            set消息列表([
              ...更新后列表,
              { role: "assistant", content: 显示内容 },
            ]);
          } catch {
            // 跳过格式错误的数据块
          }
        }
      }

      const 最终内容 = 工具动作日志
        ? 工具动作日志 + "\n---\n\n" + 搭档回复
        : 搭档回复;
      const 完整列表 = [...更新后列表, { role: "assistant" as const, content: 最终内容 }];
      set消息列表(完整列表);

      fetch(`/api/cases/${个案Id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(完整列表),
      });

      if (完整列表.length % 6 === 0 || 完整列表.length <= 2) {
        提取脉络(完整列表);
        提取咨询师画像(完整列表);
      }
    } catch (err) {
      const 错误文本 = err instanceof Error ? err.message : "未知错误";
      console.error("对话出错:", 错误文本);
      const 错误列表 = [...更新后列表, { role: "assistant" as const, content: `出错了：${错误文本}` }];
      set消息列表(错误列表);
    } finally {
      set正在回复(false);
      set工具状态(null);
    }
  }, [个案Id, 消息列表, 提取脉络, 提取咨询师画像, 获取配置]);

  // 没选中任何个案时的空状态
  if (!个案Id) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
          style={{ background: "var(--accent-light)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 className="mb-1 text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>临床搭档</h2>
        <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          在左侧新建一个来访者，开始对话
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col" style={{ background: "var(--bg)" }}>
      <div ref={滚动容器} className="flex-1 overflow-y-auto px-5 py-6">
        {/* 未配置提示 */}
        {未配置 && 消息列表.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center">
              <h2 className="mb-2 text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>还没配置 API</h2>
              <p className="mb-5 text-[13px]" style={{ color: "var(--text-secondary)" }}>需要先配置 API 才能开始对话</p>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                点击左下角「设置」进行配置
              </p>
            </div>
          </div>
        )}

        {/* 已配置、有个案、没对话时 */}
        {!未配置 && 消息列表.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center">
              <h2 className="mb-1 text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {个案名称}
              </h2>
              <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                聊聊这个来访者的情况
              </p>
            </div>
          </div>
        )}

        {消息列表.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            isStreaming={正在回复 && i === 消息列表.length - 1 && msg.role === "assistant"}
          />
        ))}
      </div>

      {/* 底部：状态提示 + 输入框 */}
      <div className="shrink-0">
        {(正在提取脉络 || 正在提取画像 || 工具状态) && (
          <div className="px-5 py-1.5 text-center text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {工具状态 && <span>{工具状态}</span>}
            {工具状态 && (正在提取脉络 || 正在提取画像) && " · "}
            {正在提取脉络 && "正在更新来访者脉络..."}
            {正在提取脉络 && 正在提取画像 && " · "}
            {正在提取画像 && "正在更新咨询师画像..."}
          </div>
        )}
        <ChatInput onSend={发送消息} disabled={正在回复} />
      </div>
    </div>
  );
}
