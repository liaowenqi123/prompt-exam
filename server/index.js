/**
 * Prompt Exam 后端
 *
 * 职责：
 * 1. 提供 /api/chat 代理，把请求转发到任意 OpenAI 兼容的 /chat/completions 接口
 *    （DeepSeek、OpenAI、本地 LM Studio 等都可以，只需配置 baseURL / apiKey / model）
 * 2. 生产环境托管前端构建产物（web/dist）
 *
 * API Key 不写死、不落盘：由用户在页面上自行填写，随请求体转发。
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
// 监听所有接口（IPv4 + IPv6，不指定 host）：本机 localhost 和局域网其它设备都能访问；
// 端口默认 31337（黑客圈"精英"端口，小众且不在 Chrome 危险端口黑名单，避免撞车），可用环境变量 PORT 覆盖
const PORT = process.env.PORT || 31337;

app.use(cors());
app.use(express.json({ limit: '4mb' }));

/**
 * POST /api/chat
 * body: {
 *   baseURL: 'https://api.deepseek.com/v1' 或 'http://localhost:30001/v1',
 *   apiKey:  '...'（可为空，本地 LM Studio 不需要）
 *   model:   'deepseek-chat' 或 'qwen/qwen3.5-9b',
 *   messages: [{ role, content }, ...],
 *   temperature: 0.7,
 *   maxTokens: 2048
 * }
 * 返回: { content: string }
 */
app.post('/api/chat', async (req, res) => {
  const { baseURL, apiKey, model, messages, temperature = 0.7, maxTokens = 2048, disableThinking = false } = req.body || {};

  if (!baseURL || !model || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '缺少必要参数 baseURL / model / messages' });
  }

  const base = String(baseURL).trim().replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 本地小模型偶发返回空内容 / 上游偶发 5xx，做几次重试增强稳定性
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${String(apiKey).trim()}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: Number(temperature) || 0.7,
          max_tokens: Number(maxTokens) || 2048,
          stream: false,
          // 本地小模型（如 qwen3.5-0.8b）是思考型，关掉思考能直接、快速地出正文
          ...(disableThinking ? { reasoning_effort: 'none' } : {}),
        }),
      });

      const data = await upstream.json().catch(() => ({}));

      if (!upstream.ok) {
        const msg = data?.error?.message || data?.error || upstream.statusText || '上游接口返回错误';
        const retryable = upstream.status >= 500 || upstream.status === 429;
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(400 * attempt);
          continue;
        }
        return res.status(upstream.status || 502).json({ error: String(msg) });
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        return res.status(502).json({ error: '上游接口返回了无法解析的响应' });
      }
      // 空内容（部分本地模型思考后不产出正文）→ 重试
      if (!content.trim() && attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt);
        continue;
      }

      return res.json({ content });
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt);
        continue;
      }
      return res.status(502).json({ error: `无法连接模型服务（${err.message}），请检查 baseURL 和网络` });
    }
  }
});

// 健康检查
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/**
 * POST /api/chat/stream  流式版：把上游的 SSE 流原样转发给前端。
 * 用途：阅卷官点评流式输出，让前端实时显示"字在往外蹦"，避免干等。
 * 请求体同 /api/chat。前端通过 EventSource/ReadableStream 读取。
 */
app.post('/api/chat/stream', async (req, res) => {
  const { baseURL, apiKey, model, messages, temperature = 0.7, maxTokens = 2048, disableThinking = false } = req.body || {};

  if (!baseURL || !model || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '缺少必要参数 baseURL / model / messages' });
  }

  const base = String(baseURL).trim().replace(/\/+$/, '');
  const url = `${base}/chat/completions`;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${String(apiKey).trim()}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: Number(temperature) || 0.7,
        max_tokens: Number(maxTokens) || 2048,
        stream: true,
        // 本地小模型（如 qwen3.5-0.8b）是思考型，关掉思考能直接、快速地出正文
        ...(disableThinking ? { reasoning_effort: 'none' } : {}),
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const data = await upstream.json().catch(() => ({}));
      const msg = data?.error?.message || data?.error || upstream.statusText || '上游接口返回错误';
      return res.status(upstream.status || 502).json({ error: String(msg) });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const handleLine = (line) => {
      const t = String(line).trim();
      if (!t.startsWith('data:')) return;
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta || {};
        // 思考型模型（如 qwen3.5）会先吐 reasoning_content，再吐 content。
        // 两者都转发，前端把思考过程显示成"内心 OS"，正式点评则实时累积。
        if (typeof delta.content === 'string' && delta.content) {
          res.write(`data: ${JSON.stringify({ type: 'content', delta: delta.content })}\n\n`);
        } else if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: delta.reasoning_content })}\n\n`);
        }
      } catch {
        /* 忽略无法解析的流块 */
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        handleLine(line);
      }
    }
    if (buffer.trim()) handleLine(buffer);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      return res.status(502).json({ error: `无法连接模型服务（${err.message}）` });
    }
    res.end();
  }
});

// 生产环境：托管前端构建产物
const distDir = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA 路由回退
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Prompt Exam server 已启动（监听全部接口 IPv4+IPv6）: http://localhost:${PORT}`);
  console.log('局域网访问: http://<本机IP>:' + PORT);
  console.log('前端开发请另开终端运行: npm run dev -w web（http://localhost:5173）');
  if (!fs.existsSync(distDir)) {
    console.log('提示: 未检测到 web/dist，如要单端口部署请先执行 npm run build。');
  }
});
