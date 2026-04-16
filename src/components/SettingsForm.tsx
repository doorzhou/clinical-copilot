// 设置表单 — API 配置

"use client";

import { useState, useEffect } from "react";

const 常用端点 = [
  { label: "智谱 (OpenAI)", url: "https://open.bigmodel.cn/api/paas/v4/" },
  { label: "智谱 (Anthropic)", url: "https://open.bigmodel.cn/api/anthropic/" },
  { label: "OpenAI", url: "https://api.openai.com/v1/" },
  { label: "Anthropic", url: "https://api.anthropic.com/v1/" },
  { label: "DeepSeek", url: "https://api.deepseek.com/v1/" },
];

export default function 设置表单() {
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
    setTimeout(() => set已保存(false), 2000);
  };

  if (加载中) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-[13px]" style={{ color: "var(--text-tertiary)" }}>
        加载配置...
      </div>
    );
  }

  const inputStyle = {
    background: "var(--bg-subtle)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>接口配置</h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          支持 OpenAI 兼容接口（智谱、DeepSeek、OpenRouter 等）和 Anthropic 接口
        </p>
      </div>

      {/* 接口地址 */}
      <div className="space-y-3">
        <label className="block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          接口地址
        </label>
        <div className="flex flex-wrap gap-2">
          {常用端点.map((item) => (
            <button
              key={item.url}
              type="button"
              onClick={() => setApiUrl(item.url)}
              className="rounded-lg px-3 py-1.5 text-[12px] transition-colors"
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
          className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
      </div>

      {/* 密钥 */}
      <div className="space-y-3">
        <label className="block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          密钥
        </label>
        <div className="relative">
          <input
            type={显示密钥 ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="填入 API Key"
            className="w-full rounded-xl px-4 py-3 pr-16 text-[13px] outline-none"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            type="button"
            onClick={() => set显示密钥(!显示密钥)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px]"
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
      <div className="space-y-3">
        <label className="block text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
          模型名称
        </label>
        <input
          type="text"
          value={模型}
          onChange={(e) => set模型(e.target.value)}
          placeholder="如 glm-4-plus、gpt-4o、claude-sonnet-4-20250514"
          className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-focus)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
      </div>

      {/* 保存 */}
      <button
        onClick={保存}
        disabled={!apiUrl.trim() || !apiKey.trim() || !模型.trim()}
        className="w-full rounded-xl px-5 py-3 text-[13px] font-medium transition-colors disabled:opacity-25"
        style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
      >
        {已保存 ? "已保存" : "保存配置"}
      </button>

      {已保存 && (
        <p className="text-center text-[12px]" style={{ color: "var(--accent)" }}>
          配置已保存，返回对话页即可使用
        </p>
      )}
    </div>
  );
}
