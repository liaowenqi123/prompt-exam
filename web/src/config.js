/**
 * 阅卷模型连接配置。
 * 现在是纯主观判卷：不执行提示词，只需要一个"阅卷模型"。
 * 默认使用 DeepSeek 官方接口；提供"本地测试（LM Studio）"预设，默认用最省钱的 0.8B 小模型。
 * 配置保存在浏览器 localStorage（API Key 只存本地，不落服务器）。
 */

const STORAGE_KEY = 'prompt-exam-config';

export const PRESETS = [
  {
    id: 'deepseek',
    name: 'DeepSeek 官方',
    desc: '阅卷模型默认 deepseek-chat',
    config: {
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
    },
  },
  {
    id: 'lmstudio',
    name: '本地测试（LM Studio）',
    desc: '连本机 LM Studio（30001），默认 qwen3.5-0.8b 超小模型：主观判卷够用，随便谁用都不花钱',
    config: {
      baseURL: 'http://localhost:30001/v1',
      apiKey: 'lm-studio',
      model: 'qwen3.5-0.8b',
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
  return Boolean((config.apiKey || '').trim());
}
