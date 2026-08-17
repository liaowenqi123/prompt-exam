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
// 监听 0.0.0.0：本机和局域网其它设备都能访问；端口默认 6666（阴间端口，避免撞车），可用环境变量 PORT 覆盖
const PORT = process.env.PORT || 6666;

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
  const { baseURL, apiKey, model, messages, temperature = 0.7, maxTokens = 2048 } = req.body || {};

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

// 生产环境：托管前端构建产物
const distDir = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // SPA 路由回退
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Prompt Exam server 已启动（监听 0.0.0.0）: http://localhost:${PORT}`);
  console.log('局域网访问: http://<本机IP>:' + PORT);
  console.log('前端开发请另开终端运行: npm run dev -w web（http://localhost:5173）');
  if (!fs.existsSync(distDir)) {
    console.log('提示: 未检测到 web/dist，如要单端口部署请先执行 npm run build。');
  }
});
