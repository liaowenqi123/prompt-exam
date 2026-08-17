import { useEffect, useState } from 'react';
import { chat, chatStream } from '../api.js';
import { randomScenarios } from '../lib/scenarios.js';
import {
  TOTAL_SCORE,
  buildScoreSystem,
  buildCommentSystem,
  buildJudgeUser,
  parseJudgeJson,
  gradeOf,
} from '../lib/scoring.js';

const EXAMPLE_PROMPT = `老板让我设计一个网站，但啥也没说清，我先按我的理解把需求补上，你当我的资深产品顾问帮我干：假设这是一家精品咖啡店的官网，目标用户是附近写字楼的上班族，用途是"品牌展示 + 在线点单 + 预约堂食"，移动端为主，风格温暖有格调。请基于这些假设，给我一份包含页面结构、核心功能、技术栈建议的网站方案；如果还有哪些我没说到、但你觉得关键的地方，列成清单让我拍板，别自己瞎定。`;

export default function Exam({ config, onExit }) {
  const [phase, setPhase] = useState('loading'); // loading | question | running | result
  const [scenario, setScenario] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  // 打分结果
  const [score, setScore] = useState(null);
  const [scoreFailed, setScoreFailed] = useState(false);
  // 流式点评
  const [comment, setComment] = useState('');
  const [thinking, setThinking] = useState('');
  const [commentError, setCommentError] = useState(null);

  const judgeConfig = {
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    model: config.model,
    disableThinking: Boolean(config.disableThinking),
  };

  const draw = () => {
    const [sc] = randomScenarios(1);
    setScenario(sc);
    setPrompt('');
    setScore(null);
    setScoreFailed(false);
    setComment('');
    setThinking('');
    setCommentError(null);
    setError('');
    setPhase('question');
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setError('');
    if (!prompt.trim()) {
      setError('先写一条提示词再交卷呀。');
      return;
    }
    setPhase('running');
    setScore(null);
    setScoreFailed(false);
    setComment('');
    setThinking('');
    setCommentError(null);

    const userMsg = { role: 'user', content: buildJudgeUser(scenario, prompt) };

    // 请求一：打分（只要分数，快）
    const scoreTask = (async () => {
      try {
        const raw = await chat(judgeConfig, [
          { role: 'system', content: buildScoreSystem() },
          userMsg,
        ], { temperature: 0.2, maxTokens: 4096, timeout: 90000 });
        const ev = parseJudgeJson(raw);
        if (ev) setScore(ev);
        else setScoreFailed(true);
      } catch {
        setScoreFailed(true);
      }
    })();

    // 请求二：点评（流式输出，前台实时显示；思考型模型的"内心 OS"也实时显示）
    const commentTask = (async () => {
      try {
        await chatStream(judgeConfig, [
          { role: 'system', content: buildCommentSystem() },
          userMsg,
        ], {
          temperature: 0.7,
          maxTokens: 4096,
          timeout: 180000,
          onDelta: setComment,
          onThinking: setThinking,
        });
      } catch (e) {
        setCommentError(e.message);
      }
    })();

    await Promise.allSettled([scoreTask, commentTask]);
    setPhase('result');
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
              <span>交卷后：先出分，点评随后流式弹出</span>
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
        <div className="running">
          <div className="card">
            <div className="progress-label">
              {score ? '📊 分数已出' : scoreFailed ? '⚠️ 打分失败了' : '⏳ 阅卷官打分中…'}
            </div>
            {score ? (
              <ScoreBlock score={score} />
            ) : (
              <div className="progress-track">
                <div className="progress-fill indeterminate" />
              </div>
            )}
          </div>

          <div className="card review-card">
            <h3>💬 阅卷官点评（实时）</h3>
            {comment ? (
              <p className="review-comment">{comment}<span className="caret" /></p>
            ) : thinking ? (
              <p className="thinking">🧠 阅卷官正在琢磨：{thinking}<span className="caret" /></p>
            ) : (
              <p className="hint">{commentError ? `点评出问题了：${commentError}` : '正在组织语言，马上就出来…'}</p>
            )}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="results">
          <div className="result-hero card">
            <div className="result-hero-left">
              <span className="scenario-cat">{scenario.category}</span>
              <h2>{scenario.title}</h2>
            </div>
            {score ? (
              <ScoreBadge score={score} />
            ) : (
              <div className="score-badge">
                <span className="score-num">—</span>
                <span className="score-max">/ {TOTAL_SCORE}</span>
                <span className="score-grade">评分暂未拿到</span>
              </div>
            )}
          </div>

          <div className="card review-card">
            <h3>💬 阅卷官点评</h3>
            {comment ? (
              <p className="review-comment">{comment}</p>
            ) : commentError ? (
              <p className="error">点评出问题了：{commentError}</p>
            ) : thinking ? (
              <>
                <p className="hint">（模型只思考没写出正文，这是它的思考过程）</p>
                <pre className="raw-output">{thinking}</pre>
              </>
            ) : (
              <p className="hint">（点评没生成）</p>
            )}
          </div>

          {score && (
            <div className="card">
              <h3>📊 打分明细</h3>
              <ScoreBlock score={score} />
            </div>
          )}
          {scoreFailed && (
            <div className="card">
              <p className="hint">打分没拿到（模型没吐出一段能解析的分数）。可以试试重考或换个模型。</p>
            </div>
          )}

          <div className="actions-row">
            <button className="btn btn-primary btn-lg" onClick={draw}>🎲 再来一题</button>
            <button className="btn btn-ghost" onClick={onExit}>回到首页</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }) {
  const grade = gradeOf(score.total);
  return (
    <div className="score-badge">
      <span className="score-num">{score.total}</span>
      <span className="score-max">/ {TOTAL_SCORE}</span>
      <span className="score-grade">{grade.emoji} {grade.label}</span>
    </div>
  );
}

function ScoreBlock({ score }) {
  return (
    <div className="criteria">
      {score.criteria.map((c) => (
        <div key={c.key} className="criterion">
          <div className="criterion-top">
            <span className="criterion-name">{c.name}</span>
            <span className="criterion-score">{c.score} / {c.max}</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${(c.score / c.max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
