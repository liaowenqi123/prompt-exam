/**
 * 评分标准（评分标准会原样写入评测模型的提示词里）
 *
 * 满分 100 分，共 8 个维度。
 */
export const CRITERIA = [
  { key: 'goal', name: '目标明确性', max: 15, desc: '是否说清楚"要做什么"、最终交付什么、达到什么效果。' },
  { key: 'instruction', name: '指令清晰性', max: 20, desc: '指令是否具体、无歧义、有逻辑，模型清楚每一步该怎么做。' },
  { key: 'context', name: '上下文与背景', max: 15, desc: '是否提供了情境、对象、读者、背景等必要信息。' },
  { key: 'role', name: '角色与受众', max: 10, desc: '是否设定了合适的角色、语气和受众意识。' },
  { key: 'format', name: '输出格式与结构', max: 15, desc: '是否规定了输出格式、长度、结构、样式等。' },
  { key: 'constraint', name: '约束与边界', max: 10, desc: '是否明确限制（不要做什么、范围、禁止项、风格禁忌）。' },
  { key: 'example', name: '示例与示范', max: 10, desc: '是否包含示例（few-shot）或示范，帮助模型理解期望。' },
  { key: 'actionable', name: '具体性与可执行性', max: 5, desc: '措辞是否具体而非空泛，是否可直接执行。' },
];

export const TOTAL_SCORE = CRITERIA.reduce((sum, c) => sum + c.max, 0); // 100

const RUBRIC_TEXT = CRITERIA.map(
  (c, i) => `${i + 1}. ${c.name}（${c.max}分）：${c.desc}`
).join('\n');

/** 执行模型用的系统提示词：让模型"认真执行考生的提示词"去完成场景任务 */
export function buildExecSystem(scenario) {
  return `你是"提示词考试"系统中的执行模型。下面是一场真实场景考试，一位考生为你写了一条提示词（指令），
你的任务只有一个：严格、完整地按照这条提示词，去完成该场景下的真实任务，并直接输出任务成果本身。
不要评价、不要点评这条提示词写得怎么样，也不要在输出里解释你的做法（除非考生提示词明确要求）。

## 场景背景
${scenario.situation}

## 本次要完成的任务
${scenario.task}
`;
}

/** 评测模型用的系统提示词：评分标准 */
export function buildEvalSystem() {
  return `你是"提示词考试"的首席阅卷官。你的职责是依据一套严格的评分标准，对考生提交的提示词（prompt）进行公正评分。

## 评分标准（总分 ${TOTAL_SCORE} 分）
${RUBRIC_TEXT}

## 评分要求
1. 逐条评分：按上面 8 个维度逐一给分（允许 0.5 分粒度），并给出简短的给分/扣分理由。理由要结合"场景需求"和"实际输出"来谈，不能只凭措辞。
2. 判断依据：先看这条提示词本身的质量，再对照"模型实际执行出的结果"判断它是否真正达成了场景任务。
3. 输出为严格的 JSON，禁止输出任何 JSON 以外的文字、解释或 Markdown 代码块围栏。

## 输出 JSON 结构（必须严格遵循）
{
  "total": 0,       // 0-100 的总分（小数）
  "criteria": [     // 顺序与评分标准一致
    { "name": "目标明确性", "score": 0, "max": 15, "reason": "给分/扣分理由" }
  ],
  "comment": "一句话总评",
  "suggestions": ["改进建议1", "改进建议2", "改进建议3"]
}`;
}

/** 评测用的用户消息 */
export function buildEvalUser(scenario, prompt, output) {
  return `## 考试场景（考生需要完成的任务）
标题：${scenario.title}
背景：${scenario.situation}
任务：${scenario.task}

## 考生提交的提示词
\`\`\`
${prompt}
\`\`\`

## 模型按这条提示词实际执行出的结果
\`\`\`
${output}
\`\`\`

请严格按照评分标准进行评分，并输出 JSON。`;
}

/** 从模型输出中提取并解析评测 JSON（容错处理代码块围栏和前后杂文） */
export function parseEvalJson(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  const candidates = [];

  // 1) ```json ... ``` 代码块围栏内内容
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());

  // 2) 第一个 { 到最后一个 } 之间的内容
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));

  // 3) 平衡括号扫描：从第一个 { 开始，匹配其真正的闭合 }（容忍尾部杂文）
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          candidates.push(text.slice(start, i + 1));
          break;
        }
      }
    }
  }

  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      const normalized = normalizeEval(obj);
      if (normalized) return normalized;
    } catch {
      /* 尝试下一个候选 */
    }
  }
  return null;
}

/** 归一化：保证 criteria 完整、数字合法 */
function normalizeEval(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const criteria = Array.isArray(obj.criteria) ? obj.criteria : [];
  const normalized = CRITERIA.map((def, i) => {
    const raw = criteria.find((c) => c && c.name === def.name) || criteria[i] || {};
    let score = Number(raw.score);
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(def.max, score));
    return {
      name: def.name,
      key: def.key,
      score,
      max: def.max,
      reason: typeof raw.reason === 'string' ? raw.reason : '',
    };
  });

  let total = Number(obj.total);
  if (!Number.isFinite(total)) total = normalized.reduce((s, c) => s + c.score, 0);
  total = Math.max(0, Math.min(TOTAL_SCORE, Math.round(total * 10) / 10));

  return {
    total,
    criteria: normalized,
    comment: typeof obj.comment === 'string' ? obj.comment : '',
    suggestions: Array.isArray(obj.suggestions)
      ? obj.suggestions.filter((s) => typeof s === 'string')
      : [],
  };
}

/** 综合多个场景的评测，给出总评 */
export function summarize(results) {
  if (!results.length) return null;
  const avg = results.reduce((s, r) => s + (r.eval?.total ?? 0), 0) / results.length;
  const best = results.reduce((a, b) => ((b.eval?.total ?? 0) > (a.eval?.total ?? 0) ? b : a), results[0]);
  const worst = results.reduce((a, b) => ((b.eval?.total ?? 0) < (a.eval?.total ?? 0) ? b : a), results[0]);
  return { avg: Math.round(avg * 10) / 10, best, worst };
}
