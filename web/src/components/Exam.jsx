import { useEffect, useState } from 'react';
import { chat } from '../api.js';
import { randomScenarios } from '../lib/scenarios.js';
import {
  TOTAL_SCORE,
  buildExecSystem,
  buildEvalSystem,
  buildEvalUser,
  parseEvalJson,
  gradeOf,
} from '../lib/scoring.js';

const EXAMPLE_PROMPT = `帮我给一家刚开的精品手冲咖啡店写个开业文案，发公众号用的。店名叫"慢慢咖啡"，主打 30 块一杯的手冲，下周六开业，在市中心写字楼楼下，主要是上班族来喝。文案要有一个吸引人的标题、150 字左右的正文、还有一句 Slogan。语气别太夸张，温暖一点就行。`;

export default function Exam({ config, onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | question | running | result
  const [scenario, setScenario] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [stepLabel, setStepLabel] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const execConfig = { baseURL: config.execBaseURL, apiKey: config.execApiKey, model: config.execModel };
  const evalConfig = { baseURL: config.evalBaseURL, apiKey: config.evalApiKey, model: config.evalModel };

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

  const runOne = async () => {
    // 阶段一：执行 —— 让 AI 严格按考生的提示词去完成任务
    setStepLabel('AI 正在按你的提示词干活…');
    let output = '';
    for (let i = 0; i < 3; i++) {
      output = await chat(execConfig, [
        { role: 'system', content: buildExecSystem(scenario) },
        { role: 'user', content: prompt },
      ], { temperature: 0.7, maxTokens: 2048 });
      if (output && output.trim()) break;
      await sleep(400);
    }
    if (!output || !output.trim()) {
      throw new Error('执行模型没有返回内容，请重试或换个模型。');
    }

    // 阶段二：评测 —— 阅卷官打分 + 点评
    setStepLabel('阅卷官正在打分、写点评…');
    let ev = null;
    let rawEval = '';
    for (let i = 0; i < 3; i++) {
      const messages = [
        { role: 'system', content: buildEvalSystem() },
        { role: 'user', content: buildEvalUser(scenario, prompt, output) },
      ];
      if (i > 0) {
        messages.push({
          role: 'user',
          content: '你上一次的输出不是严格合法的 JSON。请只重新输出一个完整的 JSON 对象，不要任何其他文字或代码块围栏。',
        });
      }
      rawEval = await chat(evalConfig, messages, { temperature: 0.4, maxTokens: 4096 });
      ev = parseEvalJson(rawEval);
      if (ev) break;
      await sleep(400);
    }

    return { scenario, output, eval: ev, rawEval };
  };

  const submit = async () => {
    setError('');
    if (!prompt.trim()) {
      setError('先写一条提示词再交卷呀。');
      return;
    }
    setPhase('running');
    try {
      const r = await runOne();
      setResult(r);
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
              <span className="question-tag">今日考题</span>
            </div>
            <h3>{scenario.title}</h3>
            <p className="question-situation">{scenario.situation}</p>
            <p className="question-task">
              <strong>任务：</strong>{scenario.task}
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
              placeholder={'像跟朋友聊天一样，写下你要交给 AI 的提示词……\n怎么舒服怎么说，把这道题交代清楚就行。'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="prompt-meta">
              <span>{prompt.length} 字</span>
              <span>想到啥写啥，不用端着</span>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="actions-row">
            <button className="btn btn-primary btn-lg" onClick={submit}>
              📤 交卷，让 AI 打分
            </button>
            <button className="btn btn-ghost" onClick={draw}>换一道题</button>
          </div>
        </>
      )}

      {phase === 'running' && (
        <div className="card run-card">
          <div className="progress-label">⏳ {stepLabel}</div>
          <div className="progress-track">
            <div className="progress-fill indeterminate" />
          </div>
          <p className="hint">AI 先真跑一遍你的提示词，阅卷官再打分点评，稍等…</p>
        </div>
      )}

      {phase === 'result' && result && (
        <ResultView
          result={result}
          onAgain={draw}
          onExit={onExit}
        />
      )}
    </div>
  );
}

function ResultView({ result, onAgain, onExit }) {
  const { scenario, output, eval: ev, rawEval } = result;
  const [showOutput, setShowOutput] = useState(false);

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

          <div className="card">
            <button className="btn btn-sm" onClick={() => setShowOutput((v) => !v)}>
              {showOutput ? '收起' : '展开'}AI 实际跑出来的结果
            </button>
            {showOutput && <pre className="raw-output">{output}</pre>}
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
