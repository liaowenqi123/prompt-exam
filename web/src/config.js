/**
 * 阅卷模型配置：写死，用户不可修改。
 * 默认：本机 LM Studio（30001 端口）的 qwen/qwen3.5-9b，关闭思考（打分、点评都快）。
 * 想换模型/改地址：改这个常量即可（部署时也可由后端代理统一处理，前端不变）。
 */
export const JUDGE_CONFIG = {
  baseURL: 'http://localhost:30001/v1',
  apiKey: 'lm-studio',
  model: 'qwen/qwen3.5-9b',
  disableThinking: true,
};
