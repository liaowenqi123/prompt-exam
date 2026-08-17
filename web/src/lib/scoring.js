/**
 * 评分标准（会在考完试后展示给用户，同时原样写入阅卷模型的提示词里）
 *
 * 核心观念：题面 = 老板，永远不把需求讲清楚。
 * 一条好提示词的本事，在于把老板没说的地方自己补上（给谁看、干嘛用、什么约束、做成啥样算好），
 * 并且像真人一样说话——自然、具体、有温度、有分寸。
 *
 * 评分是主观的：评"提示词本身好不好"，不执行、不运行。
 * 满分 100 分，共 8 个维度。
 */
export const CRITERIA = [
  { key: 'intent', name: '接住意图', max: 12, desc: '从老板一句话里抓住真正要什么，没跑偏。' },
  { key: 'gaps', name: '补齐题面', max: 20, desc: '老板没说的地方（给谁/干嘛/什么约束/什么形式），想到了多少、补上了多少。核心项。' },
  { key: 'goal', name: '目标清晰', max: 12, desc: '有没有把"做成什么样算好"讲清楚。' },
  { key: 'instruction', name: '指令具体', max: 15, desc: '要求/步骤具体，AI 知道怎么下手。' },
  { key: 'constraint', name: '边界约束', max: 10, desc: '别做什么、范围、限制说清楚了没。' },
  { key: 'natural', name: '自然像人', max: 16, desc: '像真人说话，不机器腔、不生硬。' },
  { key: 'tone', name: '语气分寸', max: 10, desc: '语气跟任务搭，有温度、有分寸，不尬不冷。' },
  { key: 'actionable', name: '具体落地', max: 5, desc: '说人话、能直接执行，还是空话套话。' },
];

export const TOTAL_SCORE = CRITERIA.reduce((sum, c) => sum + c.max, 0); // 100

const RUBRIC_TEXT = CRITERIA.map(
  (c, i) => `${i + 1}. ${c.name}（${c.max}分）：${c.desc}`
).join('\n');

/** 打分请求的系统提示词：只输出分数，又快又小 */
export function buildScoreSystem() {
  return `你是"Prompt 考试局"的阅卷官，只负责打分，一个字多余的点评都别写。

下面给出一道题（老板的原话）和一条考生提示词。请按下面 8 个维度给这条提示词打分，分数允许 0.5 的倍数。
维度与满分：接住意图 0-12、补齐题面 0-20、目标清晰 0-12、指令具体 0-15、边界约束 0-10、自然像人 0-16、语气分寸 0-10、具体落地 0-5。

打分原则：老板没说的地方，考生补得越多越好（"补齐题面"最重要）；提示词要像真人说话，自然、具体、有分寸。主观判断即可，不用考虑 AI 会不会执行。

请直接输出分数，不要输出任何思考过程或分析。只输出一个 JSON 对象，不要输出 JSON 以外的任何文字：
{"criteria":[{"name":"接住意图","score":0},{"name":"补齐题面","score":0},{"name":"目标清晰","score":0},{"name":"指令具体","score":0},{"name":"边界约束","score":0},{"name":"自然像人","score":0},{"name":"语气分寸","score":0},{"name":"具体落地","score":0}]}`;
}

/** 点评请求的系统提示词：流式输出一段针对性点评 */
export function buildCommentSystem() {
  return `你是"Prompt 考试局"的阅卷官。考生刚交了一条提示词，请你给他写一段"阅卷官点评"。这是考生最看重的东西，请认真写。

要求：
1. 像朋友聊天一样，100-200 字，自然、真诚、有温度，可以有一点轻松的调侃，但不要为了搞笑而搞笑。
2. 先说这条提示词好在哪（要具体，点出是哪句话在加分），再点出它卡在哪（要具体）。
3. 结尾给 2-4 条"马上能改"的建议，每条一行。
4. 直接输出点评文字本身，不要 JSON，不要加"以下是点评"之类的前缀，也不要输出思考过程。`;
}

/** 打分/点评共用的用户消息：题目 + 考生提示词 */
export function buildJudgeUser(scenario, prompt) {
  return `## 考题（老板的原话）
分类：${scenario.category}
标题：${scenario.title}
前情提要：${scenario.context}
老板说：${scenario.boss}

## 考生交的提示词
\`\`\`
${prompt}
\`\`\``;
}

/** 分数 → 好玩的外号 */
export function gradeOf(total) {
  if (total >= 90) return { label: '提示词大师', emoji: '🏆' };
  if (total >= 80) return { label: '江湖老手', emoji: '🌟' };
  if (total >= 70) return { label: '渐入佳境', emoji: '👍' };
  if (total >= 60) return { label: '及格了，还能再上一步', emoji: '💪' };
  return { label: '回炉重练', emoji: '🧱' };
}

/** 从打分响应中提取并解析 JSON（容错处理代码块围栏和前后杂文） */
export function parseJudgeJson(raw) {
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

  // 总分由各维度分数求和得到（小模型自己报的 total 经常算错，不可信）
  const total = Math.max(
    0,
    Math.min(TOTAL_SCORE, Math.round(normalized.reduce((s, c) => s + c.score, 0) * 10) / 10)
  );

  return {
    total,
    criteria: normalized,
    grade: gradeOf(total).label,
    comment: typeof obj.comment === 'string' ? obj.comment : '',
    suggestions: Array.isArray(obj.suggestions)
      ? obj.suggestions.filter((s) => typeof s === 'string')
      : [],
  };
}
