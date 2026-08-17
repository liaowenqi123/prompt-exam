/** 调用后端 /api/chat 代理，返回模型输出文本 */
export async function chat(config, messages, opts = {}) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      maxTokens: opts.maxTokens ?? 2048,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
  return data.content;
}

/** 让模型随机生成一个考试场景 */
export async function generateScenario(config, category = '') {
  const system = `你是"提示词考试"的场景出题官。请设计一个真实的、需要用户写提示词才能完成的场景任务。
场景要具体、有真实感，不能太宽泛（例如"写一篇文章"不行，要给出具体的背景和约束）。`;
  const user = `请${category ? `在"${category}"领域` : '随机'}设计一个新场景。
只输出一个 JSON 对象，不要输出其他文字：
{
  "category": "所属分类",
  "title": "简短场景名",
  "situation": "背景/处境（1-3 句，给用户看的）",
  "task": "要完成的具体任务（给用户看的）"
}`;
  const content = await chat(config, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { temperature: 0.9 });
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '');
  const obj = JSON.parse(text);
  if (!obj || !obj.situation || !obj.task || !obj.title) throw new Error('AI 生成的场景格式不正确');
  return {
    id: `ai_${Date.now()}`,
    category: obj.category || 'AI 随机',
    title: obj.title,
    situation: obj.situation,
    task: obj.task,
    expectation: '（AI 生成场景，无预设期望要点）',
  };
}
