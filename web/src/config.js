/**
 * 模型连接配置管理。
 * 默认使用 DeepSeek 官方接口；提供"本地 LM Studio"预设方便本地调试。
 * 配置保存在浏览器 localStorage（API Key 只存本地，不落服务器）。
 */

const STORAGE_KEY = 'prompt-exam-config';

export const PRESETS = [
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    desc: '执行模型默认 deepseek-chat，评测模型默认 deepseek-chat',
    config: {
      execBaseURL: 'https://api.deepseek.com/v1',
      execApiKey: '',
      execModel: 'deepseek-chat',
      evalBaseURL: 'https://api.deepseek.com/v1',
      evalApiKey: '',
      evalModel: 'deepseek-chat',
    },
  },
  {
    id: 'lmstudio',
    name: '本地测试（LM Studio）',
    desc: '连接本机 LM Studio（默认 30001 端口，qwen3.5-9b），无需 API Key',
    config: {
      execBaseURL: 'http://localhost:30001/v1',
      execApiKey: 'lm-studio',
      execModel: 'qwen/qwen3.5-9b',
      evalBaseURL: 'http://localhost:30001/v1',
      evalApiKey: 'lm-studio',
      evalModel: 'qwen/qwen3.5-9b',
    },
  },
];

export const DEFAULT_CONFIG = PRESETS[0].config;

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/** 是否完成配置：API Key 非空（本地 LM Studio 场景 key 为 lm-studio，也视为已配置） */
export function isConfigured(config) {
  return Boolean((config.execApiKey || '').trim() && (config.evalApiKey || '').trim());
}
