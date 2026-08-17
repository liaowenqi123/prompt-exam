/**
 * 评分标准（会在考完试后展示给用户，同时原样写入评测模型的提示词里）
 *
 * 核心观念：一条好提示词 = 两头都要占。
 *  - 办事侧：把任务交代清楚、AI 知道怎么干、能交出好结果。
 *  - 人味侧：读起来像真人说话——自然、具体、有温度、有分寸，不是一嘴机器腔。
 *
 * 满分 100 分，共 8 个维度。
 */
export const CRITERIA = [
  { key: 'goal', name: '目标明确', max: 12, desc: '说清楚要干什么、最终交什么。' },
  { key: 'instruction', name: '指令清晰', max: 15, desc: '不绕弯、不模糊，AI 知道每一步该怎么做。' },
  { key: 'context', name: '背景交代', max: 12, desc: '该给的背景、对象、读者、场景给够没有。' },
  { key: 'format', name: '格式与边界', max: 10, desc: '输出格式、长度，以及"别做什么"交代清楚。' },
  { key: 'natural', name: '自然像人', max: 16, desc: '读起来自然、不生硬、不机器腔，像真人沟通。' },
  { key: 'tone', name: '语气分寸', max: 15, desc: '语气跟任务搭，有温度、有分寸，不尬不冷。' },
  { key: 'example', name: '示例示范', max: 10, desc: '给没给例子/范例，让 AI 照着学。' },
  { key: 'actionable', name: '具体落地', max: 10, desc: '说人话、能直接执行，还是空话套话。' },
];

export const TOTAL_SCORE = CRITERIA.reduce((sum, c) => sum + c.max, 0); // 100

const RUBRIC_TEXT = CRITERIA.map(
  (c, i) => `${i + 1}. ${c.name}（${c.max}分）：${c.desc}`
).join('\n');

/** 执行模型用的系统提示词：让模型"认真执行考生的提示词"去完成任务 */
export function buildExecSystem(scenario) {
  return `你是"Prompt 考试局"里的执行模型。考生为你写了一条提示词，你的任务就是：照着它，去完成下面这道题。
照做就行，直接输出任务成果本身。不要评价这条提示词写得好不好，也不要解释你的做法（除非提示词里明确要求）。
如果提示词给的信息不够，就按你对这道题最合理的理解去完成。

## 题目背景
${scenario.situation}

## 这道题要完成的任务
${scenario.task}
`;
}

/** 评测模型用的系统提示词：重新梳理过的评分逻辑 + 生活化点评要求 */
export function buildEvalSystem() {
  return `你是"Prompt 考试局"的阅卷官。考生交上来一条提示词，AI 已经按它跑出了真实结果。你的工作是：给这条提示词打分，并给出像朋友聊天一样、但句句到位的点评。

## 评分的基本观念（这是最重要的，先想清楚再打分）
一条好提示词 = 两头都要占：
- 办事侧：把任务交代清楚，让 AI 知道怎么干活，能交出好结果。
- 人味侧：读起来像真人说话——自然、具体、有温度、有分寸，不是一嘴机器腔。
千万不要只盯着"工程细节"打分：一条提示词写得再工整，如果冷冰冰像说明书，也不该拿满分；反过来，一条口语化、生活化、但清楚好用的提示词，一样可以拿高分。
"自然像人"和"语气分寸"这两项是人味侧，要真给分，不要因为是"口头语、不正式"就扣分——只要它清楚、贴切、有分寸，就该给高分。

## 评分维度（满分 ${TOTAL_SCORE} 分）
${RUBRIC_TEXT}

## 怎么评才准
1. 结果是最硬的证据：先看 AI 按这条提示词实际跑出来的东西好不好、有没有完成题目要求，再回头评提示词本身。
2. 两头分别给分：办事侧（1-4 项）和人味侧（5-6 项）各自想清楚再打，别只盯一头。
3. 逐条给分（允许 0.5 分），理由要具体，最好能指出"哪句话让它加分、哪句话拖了后腿"。

## 点评要求（考生的重点期待，请认真写）
点评要"针对他"，不许写万能模板话术。必须结合这道题、他的提示词、AI 跑出来的结果来说：
- comment 是一段像朋友聊天一样的总评（100-200 字）：先说这条提示词好在哪（要具体），再点出它卡在哪（要具体），语气自然、真诚、有温度，可以有一点点轻松的调侃，但不要为了搞笑而搞笑。
- suggestions 给 2-4 条"马上能上手改"的具体建议。

## 输出
只输出一个 JSON 对象，不要输出 JSON 以外的任何文字、解释或代码块围栏：
{
  "total": 0,
  "criteria": [ { "name": "目标明确", "score": 0, "max": 12, "reason": "具体理由" } ],
  "grade": "一句好玩又贴切的外号，例如：提示词大师 / 江湖老手 / 初出茅庐",
  "comment": "像朋友聊天的一段总评",
  "suggestions": ["马上能改的建议1", "建议2", "建议3"]
}`;
}

/** 评测用的用户消息 */
export function buildEvalUser(scenario, prompt, output) {
  return `## 题目
标题：${scenario.title}
背景：${scenario.situation}
要求：${scenario.task}

## 考生交的提示词
\`\`\`
${prompt}
\`\`\`

## AI 按这条提示词实际跑出来的结果
\`\`\`
${output}
\`\`\`

请按评分观念和维度打分，并给出点评，只输出 JSON。`;
}

/** 分数 → 好玩的外号 */
export function gradeOf(total) {
  if (total >= 90) return { label: '提示词大师', emoji: '🏆' };
  if (total >= 80) return { label: '江湖老手', emoji: '🌟' };
  if (total >= 70) return { label: '渐入佳境', emoji: '👍' };
  if (total >= 60) return { label: '及格了，还能再上一步', emoji: '💪' };
  return { label: '回炉重练', emoji: '🧱' };
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
    grade: typeof obj.grade === 'string' && obj.grade.trim() ? obj.grade.trim() : gradeOf(total).label,
    comment: typeof obj.comment === 'string' ? obj.comment : '',
    suggestions: Array.isArray(obj.suggestions)
      ? obj.suggestions.filter((s) => typeof s === 'string')
      : [],
  };
}
