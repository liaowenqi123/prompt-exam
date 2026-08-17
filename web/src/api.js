/** 调用后端 /api/chat 代理（普通 JSON），返回模型输出文本。opts.timeout 默认 90s，超时自动中断 */
export async function chat(config, messages, opts = {}) {
  const controller = new AbortController();
  const timeout = opts.timeout ?? 90000;
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        model: config.model,
        disableThinking: Boolean(config.disableThinking),
        messages,
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 2048,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
    return data.content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用后端 /api/chat/stream 流式代理（SSE），边收边回调。
 * onDelta(fullContent)：正式输出（点评正文）实时累积。
 * onThinking(fullThinking)：思考型模型的"内心 OS"实时累积（可选）。
 */
export async function chatStream(config, messages, opts = {}) {
  const { onDelta, onThinking } = opts;
  const timeout = opts.timeout ?? 180000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        model: config.model,
        disableThinking: Boolean(config.disableThinking),
        messages,
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens ?? 2048,
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw new Error('连接流式接口失败');
  }

  if (!res.ok || !res.body) {
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败（${res.status}）`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let thinking = '';
  let timedOut = false;
  const abortTimer = setTimeout(() => {
    timedOut = true;
    reader.cancel().catch(() => {});
  }, timeout);

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const j = JSON.parse(payload);
          if (j.type === 'content' && typeof j.delta === 'string' && j.delta) {
            full += j.delta;
            if (onDelta) onDelta(full);
          } else if (j.type === 'thinking' && typeof j.delta === 'string' && j.delta) {
            thinking += j.delta;
            if (onThinking) onThinking(thinking);
          }
        } catch {
          /* 忽略无法解析的流块 */
        }
      }
    }
  } finally {
    clearTimeout(abortTimer);
  }
  if (timedOut) throw new Error('流式输出超时');
  return full;
}
