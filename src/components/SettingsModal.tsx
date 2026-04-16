// 设置弹窗 — API 配置

"use client";

import { useState, useEffect } from "react";

const 常用端点 = [
  { label: "智谱 (OpenAI)", url: "https://open.bigmodel.cn/api/paas/v4/" },
  { label: "智谱 (Anthropic)", url: "https://open.bigmodel.cn/api/anthropic/" },
  { label: "OpenAI", url: "https://api.openai.com/v1/" },
  { label: "Anthropic", url: "https://api.anthropic.com/v1/" },
  { label: "DeepSeek", url: "https://api.deepseek.com/v1/" },
];

interface 设置弹窗属性 {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: 设置弹窗属性) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [模型, set模型] = useState("");
  const [已保存, set已保存] = useState(false);
  const [显示密钥, set显示密钥] = useState(false);
  const [加载中, set加载中] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setApiUrl(data.api_base_url || "");
        setApiKey(data.api_key || "");
        set模型(data.api_model || "");
      })
      .finally(() => set加载中(false));
  }, []);

  // ESC 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const 保存 = async () => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_base_url: apiUrl.trim(),
        api_key: apiKey.trim(),
        api_model: 模型.trim(),
      }),
    });
    set已保存(true);
    setTimeout(() => {
      set已保存(false);
      onClose();
    }, 1500);
  };

  const inputStyle = {
    background: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl p-6"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>接口配置</h2>
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

        {加载中 ? (
          <div className="py-8 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>
            加载配置...
          </div>
        ) : (
          <div className="space-y-5">
            {/* 接口地址 */}
            <div className="space-y-2">
              <label className="block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                接口地址
              </label>
              <div className="flex flex-wrap gap-2">
                {常用端点.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => setApiUrl(item.url)}
                    className="rounded-lg px-3 py-1.5 text-[12px] transition-all"
                    style={{
                      background: apiUrl === item.url ? "var(--accent)" : "var(--bg-subtle)",
                      color: apiUrl === item.url ? "var(--text-inverse)" : "var(--text-secondary)",
                      border: `1px solid ${apiUrl === item.url ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="或手动填入地址"
                className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {/* 密钥 */}
            <div className="space-y-2">
              <label className="block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                密钥
              </label>
              <div className="relative">
                <input
                  type={显示密钥 ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="填入 API Key"
                  className="w-full rounded-xl px-4 py-3 pr-16 text-[13px] outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                <button
                  type="button"
                  onClick={() => set显示密钥(!显示密钥)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {显示密钥 ? "隐藏" : "显示"}
                </button>
              </div>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                密钥保存在本地文件中，不会上传到外部服务器
              </p>
            </div>

            {/* 模型 */}
            <div className="space-y-2">
              <label className="block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                模型名称
              </label>
              <input
                type="text"
                value={模型}
                onChange={(e) => set模型(e.target.value)}
                placeholder="如 glm-4-plus、gpt-4o、claude-sonnet-4-20250514"
                className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {/* 保存 */}
            <button
              onClick={保存}
              disabled={!apiUrl.trim() || !apiKey.trim() || !模型.trim()}
              className="w-full rounded-xl px-5 py-3 text-[13px] font-medium transition-all disabled:opacity-25"
              style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
            >
              {已保存 ? "已保存" : "保存配置"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
