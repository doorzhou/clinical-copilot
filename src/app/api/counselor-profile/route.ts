// 咨询师画像接口 — 从对话中提取咨询师的模式、偏好、盲点
// 配置从本地文件读取

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { 读取配置 } from "@/lib/data";

const 提取提示词 = `你是一个临床观察者。你的任务是从咨询师与搭档的对话中，提取关于**咨询师本人**的模式和特征。

注意：你关注的不是来访者，而是咨询师自己。

输出格式（严格遵守）：

## 理论偏好
（咨询师倾向使用哪些流派？精神分析、CBT、人本、家庭系统、叙事……）

## 工作风格
（提问方式、关注点、对来访者的态度和姿态）

## 敏感领域
（咨询师特别关注或擅长处理的议题类型）

## 可能的盲点
（咨询师可能回避的、不自觉忽略的方向。只标记有明确证据的模式，不要猜测）

## 反移情线索
（咨询师在讨论个案时流露的情绪反应、过度投入或回避的迹象）

注意：
- 只提取对话中明确出现的模式，不要推测
- 每个部分不超过 3-5 行
- 如果某个部分在对话中没有体现，写"暂无观察"
- 用温和的语气，这些观察是为了帮助咨询师成长，不是评判`;

function 是Anthropic协议(url: string): boolean {
  return url.includes("/anthropic") || url.includes("api.anthropic.com");
}

export async function POST(request: NextRequest) {
  const {
    messages: 对话内容,
    existingProfile: 已有画像,
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

  if (已有画像) {
    请求内容 = `以下是之前积累的咨询师画像：\n\n${已有画像}\n\n---\n\n以下是本次新的对话内容：\n\n${对话文本}\n\n请基于之前的画像和本次对话，输出更新后的完整咨询师画像。保留之前观察到的稳定模式，整合新的观察，如果之前的判断需要修正就修正。`;
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
      const 画像 = data.content?.[0]?.text || "";
      return Response.json({ profile: 画像 });

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

      const 画像 = res.choices[0]?.message?.content || "";
      return Response.json({ profile: 画像 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("咨询师画像提取失败:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
