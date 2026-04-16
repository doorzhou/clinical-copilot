// 对话接口 — 支持工具调用（读写文件），双协议，流式返回最终回复

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { 读取配置, 列出个案文件, 读取个案文件, 保存个案文件 } from "@/lib/data";

// 系统提示词
const 系统提示词 = readFileSync(
  join(process.cwd(), "src/app/prompts/system.md"),
  "utf-8"
);

// ========== 工具定义 ==========

// OpenAI 格式
const OpenAI工具: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "列出当前个案的所有附属文件（疗愈素材、练习等）",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "读取当前个案某个文件的内容",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "文件名" },
        },
        required: ["filename"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "为当前个案创建或更新一个文件（用于生成疗愈素材、练习、心理教育材料等）",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "文件名，如 正念练习.md、放松引导.html" },
          content: { type: "string", description: "文件内容" },
        },
        required: ["filename", "content"],
      },
    },
  },
];

// Anthropic 格式
const Anthropic工具 = [
  {
    name: "list_files",
    description: "列出当前个案的所有附属文件（疗愈素材、练习等）",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "read_file",
    description: "读取当前个案某个文件的内容",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: { type: "string" as const, description: "文件名" },
      },
      required: ["filename"],
    },
  },
  {
    name: "write_file",
    description: "为当前个案创建或更新一个文件（用于生成疗愈素材、练习、心理教育材料等）",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: { type: "string" as const, description: "文件名，如 正念练习.md、放松引导.html" },
        content: { type: "string" as const, description: "文件内容" },
      },
      required: ["filename", "content"],
    },
  },
];

// ========== 工具执行 ==========

function 执行工具(名称: string, 参数: Record<string, string>, 个案Id: string): string {
  try {
    switch (名称) {
      case "list_files": {
        const 文件 = 列出个案文件(个案Id);
        if (文件.length === 0) return "当前个案暂无文件。";
        return 文件.map((f) => `${f.name} (${f.size} 字节)`).join("\n");
      }
      case "read_file":
        return 读取个案文件(个案Id, 参数.filename);
      case "write_file":
        保存个案文件(个案Id, 参数.filename, 参数.content);
        return `文件「${参数.filename}」已保存。`;
      default:
        return `未知工具: ${名称}`;
    }
  } catch (err) {
    return `工具执行出错: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ========== 协议判断 ==========

function 是Anthropic协议(url: string): boolean {
  return url.includes("/anthropic") || url.includes("api.anthropic.com");
}

// ========== OpenAI 路径 ==========

type OAIMsg = OpenAI.ChatCompletionMessageParam;

async function OpenAI工具循环(
  apiKey: string,
  apiUrl: string,
  模型: string,
  初始消息: OAIMsg[],
  个案Id: string,
  onToolStatus: (msg: string) => void
): Promise<{ messages: OAIMsg[]; finalText: string }> {
  const client = new OpenAI({ apiKey, baseURL: apiUrl });
  const messages: OAIMsg[] = [...初始消息];
  const MAX_ROUNDS = 10;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await client.chat.completions.create({
      model: 模型,
      max_tokens: 4096,
      tools: OpenAI工具,
      messages,
    });

    const choice = res.choices[0];
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      // 有工具调用
      messages.push(msg as OAIMsg);

      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        const fn = tc as { id: string; type: "function"; function: { name: string; arguments: string } };
        const args = JSON.parse(fn.function.arguments || "{}");
        const 工具名 = fn.function.name;
        onToolStatus(`正在执行: ${工具名}${args.filename ? ` (${args.filename})` : ""}...`);

        const result = 执行工具(工具名, args, 个案Id);
        messages.push({
          role: "tool" as const,
          tool_call_id: fn.id,
          content: result,
        });
      }
      continue;
    }

    // 没有工具调用，返回文本
    return { messages, finalText: msg.content || "" };
  }

  throw new Error("工具调用轮数超限");
}

async function OpenAI流式回复(
  apiKey: string,
  apiUrl: string,
  模型: string,
  messages: OAIMsg[]
) {
  const client = new OpenAI({ apiKey, baseURL: apiUrl });
  return client.chat.completions.create({
    model: 模型,
    max_tokens: 4096,
    stream: true,
    messages,
  });
}

// ========== Anthropic 路径 ==========

interface AnthropicMsg {
  role: string;
  content: string | Array<Record<string, unknown>>;
}

function Anthropic端点(apiUrl: string): string {
  let endpoint = apiUrl.replace(/\/+$/, "");
  if (!endpoint.endsWith("/v1/messages")) {
    if (endpoint.endsWith("/v1")) endpoint += "/messages";
    else endpoint += "/v1/messages";
  }
  return endpoint;
}

async function Anthropic工具循环(
  apiKey: string,
  apiUrl: string,
  模型: string,
  初始消息: AnthropicMsg[],
  系统提示: string,
  个案Id: string,
  onToolStatus: (msg: string) => void
): Promise<{ messages: AnthropicMsg[]; finalText: string }> {
  const endpoint = Anthropic端点(apiUrl);
  const messages: AnthropicMsg[] = [...初始消息];
  const MAX_ROUNDS = 10;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: 模型,
        max_tokens: 4096,
        system: 系统提示,
        tools: Anthropic工具,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`接口返回 ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log(`[Anthropic工具循环] 第${round + 1}轮 stop_reason=${data.stop_reason} content块数=${data.content?.length}`);
    const content: Array<Record<string, unknown>> = data.content || [];

    // 提取文本和工具调用
    let text = "";
    const toolUses: Array<{ id: string; name: string; input: Record<string, string> }> = [];

    for (const block of content) {
      console.log(`[Anthropic工具循环] block type=${block.type}`);
      if (block.type === "text") text += block.text;
      if (block.type === "tool_use") {
        toolUses.push({
          id: block.id as string,
          name: block.name as string,
          input: block.input as Record<string, string>,
        });
      }
    }

    if (toolUses.length > 0) {
      // 有工具调用
      messages.push({ role: "assistant", content });

      const toolResults: Array<Record<string, unknown>> = [];
      for (const tu of toolUses) {
        onToolStatus(`正在执行: ${tu.name}${tu.input.filename ? ` (${tu.input.filename})` : ""}...`);
        const result = 执行工具(tu.name, tu.input, 个案Id);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result,
        });
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // 没有工具调用
    return { messages, finalText: text };
  }

  throw new Error("工具调用轮数超限");
}

async function Anthropic流式回复(
  apiKey: string,
  apiUrl: string,
  模型: string,
  messages: AnthropicMsg[],
  系统提示: string
) {
  const endpoint = Anthropic端点(apiUrl);
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: 模型,
      max_tokens: 4096,
      stream: true,
      system: 系统提示,
      messages,
    }),
  });
}

// ========== 主处理函数 ==========

export async function POST(request: NextRequest) {
  const {
    messages: 对话历史,
    caseContext: 个案上下文,
    counselorProfile: 咨询师画像,
    caseId: 个案Id,
  } = await request.json();

  const cfg = 读取配置();
  const apiKey = cfg.api_key;
  const apiUrl = cfg.api_base_url;
  const 模型 = cfg.api_model;

  if (!apiKey || !apiUrl || !模型) {
    return new Response(
      JSON.stringify({ error: "请先在设置页配置接口地址、密钥和模型" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let 完整提示词 = 系统提示词;
  if (咨询师画像) {
    完整提示词 += `\n\n## 关于这位咨询师\n\n以下是你对这位咨询师的长期观察，用于更好地配合ta的工作风格，以及在适当时候温和地指出可能的盲点：\n\n${咨询师画像}`;
  }
  if (个案上下文) {
    完整提示词 += `\n\n## 当前个案上下文\n\n${个案上下文}`;
  }
  if (个案Id) {
    完整提示词 += `\n\n## 文件工具

你拥有本地文件读写能力。以下工具直接操作咨询师电脑上的本地文件（路径：data/cases/当前个案/files/）：

- **list_files** — 列出当前个案的所有文件
- **read_file** — 读取某个文件的内容
- **write_file** — 创建或更新文件（直接写入本地磁盘）

当咨询师需要你生成疗愈素材、练习、心理教育材料、作业单等，使用 write_file 保存为文件（.md、.html、.txt 等格式）。文件会立即保存到本地磁盘，咨询师可以在界面右侧信息面板的「文件」标签页查看、编辑、删除。

重要：这些工具是真实的本地文件操作，不是模拟的。write_file 会真正创建文件，read_file 会读取真实文件内容。当咨询师问文件在哪里时，告诉ta可以在信息面板的「文件」标签页找到，也可以在电脑上的 data/cases/ 目录下找到实际文件。`;
  }

  const 用Anthropic = 是Anthropic协议(apiUrl);
  const encoder = new TextEncoder();

  try {
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // 工具状态回调：发送状态事件到客户端
          const onToolStatus = (msg: string) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ toolStatus: msg })}\n\n`)
            );
          };

          if (用Anthropic) {
            // ===== Anthropic 路径 =====
            const 初始消息: AnthropicMsg[] = 对话历史.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            }));

            let finalText: string;
            let finalMessages: AnthropicMsg[];

            if (个案Id) {
              // 有个案 → 走工具循环
              const result = await Anthropic工具循环(apiKey, apiUrl, 模型, 初始消息, 完整提示词, 个案Id, onToolStatus);
              finalText = result.finalText;
              finalMessages = result.messages;
            } else {
              finalText = "";
              finalMessages = 初始消息;
            }

            if (finalText) {
              // 工具循环已经得到最终文本，直接发送
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: finalText })}\n\n`));
            } else {
              // 做一次流式调用
              const res = await Anthropic流式回复(apiKey, apiUrl, 模型, finalMessages, 完整提示词);
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(`接口返回 ${res.status}: ${errText}`);
              }

              const reader = res.body?.getReader();
              if (!reader) throw new Error("无法读取响应流");

              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const data = line.slice(6).trim();
                  if (data === "[DONE]") continue;

                  try {
                    const event = JSON.parse(data);
                    if (event.type === "content_block_delta" && event.delta?.text) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                      );
                    }
                    if (event.type === "error") {
                      throw new Error(event.error?.message || JSON.stringify(event));
                    }
                  } catch (parseErr) {
                    if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                      throw parseErr;
                    }
                  }
                }
              }
            }

          } else {
            // ===== OpenAI 路径 =====
            const 初始消息: OAIMsg[] = [
              { role: "system" as const, content: 完整提示词 },
              ...对话历史.map((m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
            ];

            let finalMessages: OAIMsg[];

            if (个案Id) {
              // 有个案 → 走工具循环
              const result = await OpenAI工具循环(apiKey, apiUrl, 模型, 初始消息, 个案Id, onToolStatus);

              if (result.finalText) {
                // 工具循环已得到最终文本
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: result.finalText })}\n\n`));
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
              finalMessages = result.messages;
            } else {
              finalMessages = 初始消息;
            }

            // 流式调用
            const stream = await OpenAI流式回复(apiKey, apiUrl, 模型, finalMessages);
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API 调用失败:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
