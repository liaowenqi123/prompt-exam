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

/** 阅卷模型的系统提示词：主观判卷 + 生活化点评 */
export function buildEvalSystem() {
  return `你是"Prompt 考试局"的阅卷官，负责主观判卷。

## 背景设定
考生是个"打工人"。老板（题目）只丢了一句话，永远不会把需求讲清楚。考生的任务：把这句话变成一条提示词交给 AI，靠这条提示词把活儿干成。你要评的就是：这条提示词好不好。注意：不会真的让 AI 去执行，你只凭专业判断去评这条提示词本身。

## 评分观念（先想清楚再打分）
1. 最关键的一条：老板没说的地方，考生补了多少。一条好提示词绝不会把老板的话原样抄给 AI——它会自己想清楚（或让 AI 先想清楚）那些题面上没有的东西：给谁看、用来干嘛、什么形式、什么约束、做成什么样算好。
2. 两头都要看：会不会办事（把需求讲清楚、可执行）+ 像不像人（自然、有温度、不机器腔）。只工整不自然，不该拿满分；口语化但清楚好用，照样能拿高分。
3. 评分是主观的，凭你的专业判断，不要纠结"AI 会不会执行"这种没发生的事。

## 评分维度（满分 ${TOTAL_SCORE} 分）
${RUBRIC_TEXT}

## 怎么评才准
1. 代入自己当那个 AI：光看这条提示词，我知不知道该怎么干？缺不缺关键信息？
2. 再看有没有"超出题面"的思考：考生有没有自己补上、或要求 AI 确认那些老板没说的事？有没有把"好"定义出来？
3. 逐条给分（允许 0.5 分），理由要具体，最好能点名"哪句话加分、哪句话拖了后腿"。

## 点评要求（考生的重点期待）
点评要"针对他"，不许写万能模板话术。必须结合这道题和他的提示词来说：
- comment 是一段像朋友聊天一样的总评（100-200 字）：先说这条提示词好在哪（要具体），再点出它卡在哪（要具体），语气自然、真诚、有温度，可以有一点点轻松的调侃，但不要为了搞笑而搞笑。
- suggestions 给 2-4 条"马上能上手改"的具体建议。

## 输出
只输出一个 JSON 对象，不要输出 JSON 以外的任何文字、解释或代码块围栏：
{
  "total": 0,
  "criteria": [ { "name": "补齐题面", "score": 0, "max": 20, "reason": "具体理由" } ],
  "comment": "像朋友聊天的一段总评",
  "suggestions": ["马上能改的建议1", "建议2", "建议3"]
}`;
}

/** 阅卷用的用户消息 */
export function buildEvalUser(scenario, prompt) {
  return `## 考题（老板的原话）
分类：${scenario.category}
标题：${scenario.title}
前情提要：${scenario.context}
老板说：${scenario.boss}

## 考生交的提示词
\`\`\`
${prompt}
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
