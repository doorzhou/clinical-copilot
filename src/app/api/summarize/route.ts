// 摘要接口 — 对话结束后，提取本次对话的关键信息，更新来访者脉络
// 配置从本地文件读取

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { 读取配置 } from "@/lib/data";

const 提取提示词 = `你是一个临床记录助手。请从以下咨询师与搭档的对话中，提取关于来访者的关键信息。

输出格式（严格遵守）：

## 来访者基本情况
（年龄、性别、职业、家庭状况等，如未提及写"暂无"）

## 主诉与核心议题
（来访者的主要问题和困扰）

## 本次会话要点
（本次对话中讨论的关键内容，用要点列表）

## 咨询师的观察与假设
（咨询师在对话中表达的判断、直觉、疑惑）

## 待跟进的线索
（尚未展开但值得后续关注的内容）

注意：
- 只提取对话中明确出现的信息，不要推测
- 保持简洁，每个部分不超过 3-5 行
- 如果某个部分在对话中完全没涉及，写"本次未涉及"`;

function 是Anthropic协议(url: string): boolean {
  return url.includes("/anthropic") || url.includes("api.anthropic.com");
}

export async function POST(request: NextRequest) {
  const {
    messages: 对话内容,
    existingSummary: 已有脉络,
  } = await request.json();

  const cfg = 读取配置();
  const apiKey = cfg.api_key;
  const apiUrl = cfg.api_base_url;
  const 模型 = cfg.api_model;

  if (!apiKey || !apiUrl || !模型) {
    return new Response(
      JSON.stringify({ error: "未配置" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const 对话文本 = 对话内容
    .map((m: { role: string; content: string }) =>
      `【${m.role === "user" ? "咨询师" : "搭档"}】${m.content}`
    )
    .join("\n\n");

  let 请求内容 = `以下是本次对话内容：\n\n${对话文本}`;

  if (已有脉络) {
    请求内容 = `以下是之前积累的来访者脉络：\n\n${已有脉络}\n\n---\n\n以下是本次新的对话内容：\n\n${对话文本}\n\n请基于之前的脉络和本次对话，输出更新后的完整脉络。保留之前的重要信息，整合新信息，去掉重复的。`;
  }

  try {
    if (是Anthropic协议(apiUrl)) {
      let endpoint = apiUrl.replace(/\/+$/, "");
      if (!endpoint.endsWith("/v1/messages")) {
        if (endpoint.endsWith("/v1")) endpoint += "/messages";
        else endpoint += "/v1/messages";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: 模型,
          max_tokens: 2048,
          system: 提取提示词,
          messages: [{ role: "user", content: 请求内容 }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`接口错误 ${res.status}: ${err}`);
      }

      const data = await res.json();
      const 摘要 = data.content?.[0]?.text || "";
      return Response.json({ summary: 摘要 });

    } else {
      const client = new OpenAI({ apiKey, baseURL: apiUrl });
      const res = await client.chat.completions.create({
        model: 模型,
        max_tokens: 2048,
        messages: [
          { role: "system" as const, content: 提取提示词 },
          { role: "user" as const, content: 请求内容 },
        ],
      });

      const 摘要 = res.choices[0]?.message?.content || "";
      return Response.json({ summary: 摘要 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("摘要提取失败:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
