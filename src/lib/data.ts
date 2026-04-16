// 本地数据层 — 所有文件 I/O 集中在这里，仅服务端使用

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync, unlinkSync } from "fs";
import { join } from "path";

const 数据目录 = join(process.cwd(), "data");
const 个案目录 = join(数据目录, "cases");
const 索引文件 = join(个案目录, "index.json");

// 确保目录存在
function 确保目录(路径: string) {
  mkdirSync(路径, { recursive: true });
}

// 路径安全校验
export function 校验个案Id(id: string) {
  if (!/^case_\d+$/.test(id)) throw new Error(`非法个案ID: ${id}`);
}

function 校验文件名(name: string) {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error(`非法文件名: ${name}`);
  }
}

// ========== 配置 ==========

export interface 配置 {
  api_base_url: string;
  api_key: string;
  api_model: string;
}

const 配置文件 = join(数据目录, "config.json");

export function 读取配置(): 配置 {
  try {
    return JSON.parse(readFileSync(配置文件, "utf-8"));
  } catch {
    return { api_base_url: "", api_key: "", api_model: "" };
  }
}

export function 保存配置(config: 配置) {
  确保目录(数据目录);
  writeFileSync(配置文件, JSON.stringify(config, null, 2), "utf-8");
}

// ========== 咨询师画像 ==========

const 画像文件 = join(数据目录, "counselor_profile.md");

export function 读取咨询师画像(): string {
  try {
    return readFileSync(画像文件, "utf-8");
  } catch {
    return "";
  }
}

export function 保存咨询师画像(内容: string) {
  确保目录(数据目录);
  writeFileSync(画像文件, 内容, "utf-8");
}

// ========== 个案列表 ==========

export interface 个案信息 {
  id: string;
  name: string;
  createdAt: number;
}

export function 读取个案列表(): 个案信息[] {
  try {
    return JSON.parse(readFileSync(索引文件, "utf-8"));
  } catch {
    return [];
  }
}

export function 保存个案列表(列表: 个案信息[]) {
  确保目录(个案目录);
  writeFileSync(索引文件, JSON.stringify(列表, null, 2), "utf-8");
}

// ========== 个案对话 ==========

export interface 消息 {
  role: "user" | "assistant";
  content: string;
}

export function 读取对话(个案Id: string): 消息[] {
  校验个案Id(个案Id);
  try {
    return JSON.parse(readFileSync(join(个案目录, 个案Id, "chat.json"), "utf-8"));
  } catch {
    return [];
  }
}

export function 保存对话(个案Id: string, 消息列表: 消息[]) {
  校验个案Id(个案Id);
  const dir = join(个案目录, 个案Id);
  确保目录(dir);
  writeFileSync(join(dir, "chat.json"), JSON.stringify(消息列表, null, 2), "utf-8");
}

// ========== 个案脉络 ==========

export function 读取脉络(个案Id: string): string {
  校验个案Id(个案Id);
  try {
    return readFileSync(join(个案目录, 个案Id, "summary.md"), "utf-8");
  } catch {
    return "";
  }
}

export function 保存脉络(个案Id: string, 内容: string) {
  校验个案Id(个案Id);
  const dir = join(个案目录, 个案Id);
  确保目录(dir);
  writeFileSync(join(dir, "summary.md"), 内容, "utf-8");
}

// ========== 删除个案 ==========

export function 删除个案目录(个案Id: string) {
  校验个案Id(个案Id);
  const dir = join(个案目录, 个案Id);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
  }
}

// ========== 文件浏览器 ==========

export interface 文件信息 {
  name: string;
  size: number;
  modifiedAt: number;
}

function 个案文件目录(个案Id: string): string {
  校验个案Id(个案Id);
  return join(个案目录, 个案Id, "files");
}

export function 列出个案文件(个案Id: string): 文件信息[] {
  const dir = 个案文件目录(个案Id);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .map((name) => {
      const stat = statSync(join(dir, name));
      if (!stat.isFile()) return null;
      return { name, size: stat.size, modifiedAt: stat.mtimeMs };
    })
    .filter((f): f is 文件信息 => f !== null)
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
}

export function 读取个案文件(个案Id: string, 文件名: string): string {
  校验文件名(文件名);
  return readFileSync(join(个案文件目录(个案Id), 文件名), "utf-8");
}

export function 保存个案文件(个案Id: string, 文件名: string, 内容: string) {
  校验文件名(文件名);
  const dir = 个案文件目录(个案Id);
  确保目录(dir);
  writeFileSync(join(dir, 文件名), 内容, "utf-8");
}

export function 删除个案文件(个案Id: string, 文件名: string) {
  校验文件名(文件名);
  const 路径 = join(个案文件目录(个案Id), 文件名);
  if (existsSync(路径)) unlinkSync(路径);
}

// ========== 日程 ==========

const 日程目录 = join(数据目录, "calendar");
const 日程文件 = join(日程目录, "events.json");

export interface 日程 {
  id: string;
  title: string;
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  caseId: string | null;
  notes: string;
}

export function 读取日程列表(): 日程[] {
  try {
    return JSON.parse(readFileSync(日程文件, "utf-8"));
  } catch {
    return [];
  }
}

export function 保存日程列表(列表: 日程[]) {
  确保目录(日程目录);
  writeFileSync(日程文件, JSON.stringify(列表, null, 2), "utf-8");
}
