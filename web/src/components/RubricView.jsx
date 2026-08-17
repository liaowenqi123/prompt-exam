import { CRITERIA, TOTAL_SCORE } from '../lib/scoring.js';

export default function RubricView() {
  return (
    <div className="page">
      <div className="page-head">
        <h2>评分标准（满分 {TOTAL_SCORE} 分）</h2>
        <p>
          每场考试，评测模型都会拿着这份标准给你的提示词逐条打分。标准公开、透明，赢要赢得明明白白。
        </p>
      </div>

      <div className="rubric-list">
        {CRITERIA.map((c, i) => (
          <div key={c.key} className="rubric-card">
            <div className="rubric-top">
              <span className="rubric-index">{String(i + 1).padStart(2, '0')}</span>
              <div className="rubric-main">
                <h3>{c.name}</h3>
                <p>{c.desc}</p>
              </div>
              <span className="rubric-max">{c.max} 分</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card note-card">
        <h3>💡 评分怎么运作？</h3>
        <ol className="note-list">
          <li>系统给你一个真实场景（比如"为咖啡店写开业文案"）。</li>
          <li>你写一条提示词，提交考试。</li>
          <li>执行模型严格按你的提示词，去完成这个场景任务，产出真实结果。</li>
          <li>评测模型对照上面这份标准，结合"场景需求"和"实际产出"，给你的提示词打分并给出改进建议。</li>
          <li>多场景模式下，取多个场景的平均分作为最终成绩。</li>
        </ol>
      </div>
    </div>
  );
}
