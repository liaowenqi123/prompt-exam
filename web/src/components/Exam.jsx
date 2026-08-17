import { useEffect, useState } from 'react';
import { chat } from '../api.js';
import { randomScenarios } from '../lib/scenarios.js';
import {
  TOTAL_SCORE,
  buildEvalSystem,
  buildEvalUser,
  parseEvalJson,
  gradeOf,
} from '../lib/scoring.js';

const EXAMPLE_PROMPT = `老板让我设计一个网站，但啥也没说清，我先按我的理解把需求补上，你当我的资深产品顾问帮我干：假设这是一家精品咖啡店的官网，目标用户是附近写字楼的上班族，用途是"品牌展示 + 在线点单 + 预约堂食"，移动端为主，风格温暖有格调。请基于这些假设，给我一份包含页面结构、核心功能、技术栈建议的网站方案；如果还有哪些我没说到、但你觉得关键的地方，列成清单让我拍板，别自己瞎定。`;

export default function Exam({ config, onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | question | running | result
  const [scenario, setScenario] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const judgeConfig = { baseURL: config.baseURL, apiKey: config.apiKey, model: config.model };

  const draw = () => {
    const [sc] = randomScenarios(1);
    setScenario(sc);
    setPrompt('');
    setResult(null);
    setError('');
    setPhase('question');
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const submit = async () => {
    setError('');
    if (!prompt.trim()) {
      setError('先写一条提示词再交卷呀。');
      return;
    }
    setPhase('running');
    try {
      let ev = null;
      let rawEval = '';
      for (let i = 0; i < 3; i++) {
        const messages = [
          { role: 'system', content: buildEvalSystem() },
          { role: 'user', content: buildEvalUser(scenario, prompt) },
        ];
        if (i > 0) {
          messages.push({
            role: 'user',
            content: '你上一次的输出不是严格合法的 JSON。请只重新输出一个完整的 JSON 对象，不要任何其他文字或代码块围栏。',
          });
        }
        rawEval = await chat(judgeConfig, messages, { temperature: 0.4, maxTokens: 4096 });
        ev = parseEvalJson(rawEval);
        if (ev) break;
        await sleep(400);
      }
      setResult({ scenario, prompt, eval: ev, rawEval });
      setPhase('result');
    } catch (e) {
      setError(e.message);
      setPhase('question');
    }
  };

  if (phase === 'loading' || !scenario) {
    return <div className="card loading-card">抽题中…</div>;
  }

  return (
    <div className="exam">
      {phase === 'question' && (
        <>
          <div className="card question-card">
            <div className="question-head">
              <span className="scenario-cat">{scenario.category}</span>
              <span className="question-tag">老板发话了</span>
            </div>
            <h3>{scenario.title}</h3>
            <p className="question-context">{scenario.context}</p>
            <p className="question-boss">“{scenario.boss}”</p>
            <p className="question-task">
              💡 老板不会把需求讲清楚。你的活儿：把这句话变成一条提示词交给 AI，靠它把事办成——老板没说的地方，你来补。
            </p>
          </div>

          <div className="card">
            <div className="section-head">
              <h3>写你的提示词</h3>
              <div className="section-actions">
                <button className="btn btn-sm" onClick={() => setPrompt(EXAMPLE_PROMPT)}>看个示例</button>
                <button className="btn btn-sm" onClick={() => setPrompt('')} disabled={!prompt}>清空</button>
              </div>
            </div>
            <textarea
              className="prompt-input"
              rows={6}
              placeholder={'像平常聊天一样，写下你要交给 AI 的提示词……\n关键是：老板没说清的地方，你要想到、补上。'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="prompt-meta">
              <span>{prompt.length} 字</span>
              <span>阅卷官只看你的提示词，不实际执行</span>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="actions-row">
            <button className="btn btn-primary btn-lg" onClick={submit}>
              📤 交卷，让阅卷官打分
            </button>
            <button className="btn btn-ghost" onClick={draw}>换一道题</button>
          </div>
        </>
      )}

      {phase === 'running' && (
        <div className="card run-card">
          <div className="progress-label">⏳ 阅卷官正在打分、写点评…</div>
          <div className="progress-track">
            <div className="progress-fill indeterminate" />
          </div>
          <p className="hint">纯主观判卷，不实际执行你的提示词，稍等…</p>
        </div>
      )}

      {phase === 'result' && result && (
        <ResultView result={result} onAgain={draw} onExit={onExit} />
      )}
    </div>
  );
}

function ResultView({ result, onAgain, onExit }) {
  const { scenario, eval: ev, rawEval } = result;
  const grade = ev ? gradeOf(ev.total) : null;

  return (
    <div className="results">
      <div className="result-hero card">
        <div className="result-hero-left">
          <span className="scenario-cat">{scenario.category}</span>
          <h2>{scenario.title}</h2>
        </div>
        <div className="score-badge">
          <span className="score-num">{ev ? ev.total : '—'}</span>
          <span className="score-max">/ {TOTAL_SCORE}</span>
          <span className="score-grade">
            {grade ? `${grade.emoji} ${ev.grade || grade.label}` : ''}
          </span>
        </div>
      </div>

      {!ev && (
        <div className="card">
          <p className="hint">阅卷官没吐出一段能解析的评分。下面是他的原话：</p>
          <pre className="raw-output">{rawEval}</pre>
        </div>
      )}

      {ev && (
        <>
          <div className="card review-card">
            <h3>💬 阅卷官点评</h3>
            <p className="review-comment">{ev.comment}</p>
            {ev.suggestions.length > 0 && (
              <div className="suggestions">
                <h5>🧰 马上能改的</h5>
                <ul>
                  {ev.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card">
            <h3>📊 打分明细</h3>
            <div className="criteria">
              {ev.criteria.map((c) => (
                <div key={c.key} className="criterion">
                  <div className="criterion-top">
                    <span className="criterion-name">{c.name}</span>
                    <span className="criterion-score">{c.score} / {c.max}</span>
                  </div>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${(c.score / c.max) * 100}%` }} />
                  </div>
                  {c.reason && <p className="criterion-reason">{c.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="actions-row">
        <button className="btn btn-primary btn-lg" onClick={onAgain}>🎲 再来一题</button>
        <button className="btn btn-ghost" onClick={onExit}>回到首页</button>
      </div>
    </div>
  );
}
