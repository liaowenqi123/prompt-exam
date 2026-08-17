import { useMemo, useRef, useState } from 'react';
import { chat, generateScenario } from '../api.js';
import { CATEGORIES, SCENARIOS, getScenario, randomScenarios } from '../lib/scenarios.js';
import {
  CRITERIA,
  TOTAL_SCORE,
  buildExecSystem,
  buildEvalSystem,
  buildEvalUser,
  parseEvalJson,
  summarize,
} from '../lib/scoring.js';

const EXAMPLE_PROMPT = `你是一位资深咖啡品牌文案策划。请为一家即将开业的精品手冲咖啡店撰写开业宣传文案。

背景：门店位于市中心写字楼商圈，主要客群是附近的上班族，人均消费 30-40 元，主打精品手冲、安静有格调的空间。

要求：
1. 输出 1 个公众号文章标题（30 字以内）和 1 句品牌 Slogan；
2. 正文 300 字左右，突出"慢下来、认真喝一杯咖啡"的理念，避免夸张营销词；
3. 语气温暖、克制、有格调，符合都市白领审美；
4. 结尾附上开业优惠信息占位符。`;

function gradeOf(score) {
  if (score >= 90) return { label: '提示词大师级', emoji: '🏆' };
  if (score >= 80) return { label: '优秀', emoji: '🌟' };
  if (score >= 70) return { label: '良好', emoji: '👍' };
  if (score >= 60) return { label: '及格', emoji: '🙂' };
  return { label: '需要打磨', emoji: '🧱' };
}

export default function TestView({ config }) {
  const [mode, setMode] = useState('single');
  const [catFilter, setCatFilter] = useState('全部');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [customScenarios, setCustomScenarios] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(null); // { index, total, label }
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const resultsRef = useRef(results);
  resultsRef.current = results;

  const execConfig = useMemo(
    () => ({ baseURL: config.execBaseURL, apiKey: config.execApiKey, model: config.execModel }),
    [config]
  );
  const evalConfig = useMemo(
    () => ({ baseURL: config.evalBaseURL, apiKey: config.evalApiKey, model: config.evalModel }),
    [config]
  );

  const allScenarios = useMemo(() => [...SCENARIOS, ...customScenarios], [customScenarios]);
  const singlePool = useMemo(
    () => (catFilter === '全部' ? allScenarios : allScenarios.filter((s) => s.category === catFilter)),
    [allScenarios, catFilter]
  );
  const selectedScenarios = useMemo(() => {
    if (mode === 'single') {
      return selectedId ? [getScenario(selectedId) || customScenarios.find((s) => s.id === selectedId)] : [];
    }
    return selectedIds
      .map((id) => getScenario(id) || customScenarios.find((s) => s.id === id))
      .filter(Boolean);
  }, [mode, selectedId, selectedIds, customScenarios]);

  const summary = useMemo(() => summarize(results), [results]);

  const pickSingle = (id) => {
    setSelectedId(id);
    if (mode === 'batch') {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]
      );
    }
  };

  const toggleBatch = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]
    );
  };

  const addRandomBatch = () => {
    const ids = randomScenarios(3)
      .map((s) => s.id)
      .filter((id) => !selectedIds.includes(id));
    setSelectedIds((prev) => [...prev, ...ids].slice(0, 5));
  };

  const aiGenerate = async () => {
    setAiBusy(true);
    setError('');
    try {
      const sc = await generateScenario(execConfig, catFilter === '全部' ? '' : catFilter);
      setCustomScenarios((prev) => [...prev, sc]);
      if (mode === 'single') {
        setSelectedId(sc.id);
        setCatFilter('全部');
      } else {
        setSelectedIds((prev) => (prev.length >= 5 ? prev : [...prev, sc.id]));
      }
    } catch (e) {
      setError(`AI 生成场景失败：${e.message}`);
    } finally {
      setAiBusy(false);
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const runOne = async (scenario) => {
    // 阶段一：执行 —— 让执行模型按考生的提示词完成场景任务
    setStep((s) => ({ ...s, label: `执行中 · ${scenario.title}` }));
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
      throw new Error(`执行模型没有返回内容（${scenario.title}），请重试或更换模型。`);
    }

    // 阶段二：评测 —— 让评测模型按评分标准打分
    setStep((s) => ({ ...s, label: `评分中 · ${scenario.title}` }));
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
      rawEval = await chat(evalConfig, messages, { temperature: 0.3, maxTokens: 4096 });
      ev = parseEvalJson(rawEval);
      if (ev) break;
      await sleep(400);
    }

    return {
      scenario,
      output,
      eval: ev,
      rawEval,
    };
  };

  const run = async () => {
    setError('');
    if (!prompt.trim()) {
      setError('请先写下你的提示词。');
      return;
    }
    if (selectedScenarios.length === 0) {
      setError(mode === 'single' ? '请先选择一个场景。' : '请至少选择一个场景（建议 3 个以上）。');
      return;
    }

    setRunning(true);
    setResults([]);
    const total = selectedScenarios.length;
    try {
      for (let i = 0; i < total; i++) {
        setStep({ index: i + 1, total, label: '准备中…' });
        const r = await runOne(selectedScenarios[i]);
        setResults((prev) => [...prev, r]);
      }
    } catch (e) {
      setError(`考试中断：${e.message}`);
    } finally {
      setRunning(false);
      setStep(null);
    }
  };

  const reset = () => {
    setResults([]);
    setError('');
    setStep(null);
  };

  const isScenarioSelected = (id) =>
    mode === 'single' ? selectedId === id : selectedIds.includes(id);

  return (
    <div className="page">
      {/* 模式切换 */}
      <div className="mode-bar">
        <button className={mode === 'single' ? 'mode active' : 'mode'} onClick={() => setMode('single')}>
          单场景考试
        </button>
        <button className={mode === 'batch' ? 'mode active' : 'mode'} onClick={() => setMode('batch')}>
          多场景考试（1 条提示词打 3~5 个场景）
        </button>
      </div>

      {/* 场景选择 */}
      <section className="card">
        <div className="section-head">
          <h3>{mode === 'single' ? '① 选择考试场景' : '① 勾选考试场景（建议 3 个以上，最多 5 个）'}</h3>
          <div className="section-actions">
            {mode === 'single' && (
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="全部">全部分类</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {mode === 'batch' && (
              <button className="btn btn-sm" onClick={addRandomBatch}>🎲 随机选 3 个</button>
            )}
            <button className="btn btn-sm" onClick={aiGenerate} disabled={aiBusy}>
              {aiBusy ? '生成中…' : '✨ AI 生成场景'}
            </button>
          </div>
        </div>

        <div className="scenario-grid">
          {singlePool.map((s) => (
            <button
              key={s.id}
              className={`scenario-card ${isScenarioSelected(s.id) ? 'selected' : ''}`}
              onClick={() => pickSingle(s.id)}
            >
              <span className="scenario-cat">{s.category}</span>
              <strong>{s.title}</strong>
              <p>{s.situation}</p>
              <em>任务：{s.task}</em>
              {mode === 'batch' && (
                <span className="check">{isScenarioSelected(s.id) ? '✓ 已选' : '未选'}</span>
              )}
            </button>
          ))}
        </div>
        {singlePool.length === 0 && <p className="empty">该分类下暂无场景。</p>}
      </section>

      {/* 提示词输入 */}
      <section className="card">
        <div className="section-head">
          <h3>② 写下你的提示词</h3>
          <div className="section-actions">
            <button className="btn btn-sm" onClick={() => setPrompt(EXAMPLE_PROMPT)}>填充示例提示词</button>
            <button className="btn btn-sm" onClick={() => setPrompt('')} disabled={!prompt}>清空</button>
          </div>
        </div>
        <textarea
          className="prompt-input"
          rows={6}
          placeholder={'把你要交给大模型的提示词写在这里……\n例如：你是一位资深文案策划，请为一家精品手冲咖啡店写一份开业宣传文案，要求包含标题、正文和 Slogan……'}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={running}
        />
        <div className="prompt-meta">
          <span>{prompt.length} 字</span>
          {mode === 'batch' && selectedScenarios.length > 0 && (
            <span>将用这条提示词考 {selectedScenarios.length} 个场景</span>
          )}
        </div>
      </section>

      {/* 运行 */}
      <section className="card run-card">
        {!running && results.length === 0 && (
          <button className="btn btn-primary btn-lg" onClick={run} disabled={selectedScenarios.length === 0 || !prompt.trim()}>
            🚀 提交考试
          </button>
        )}
        {running && (
          <div className="progress-area">
            <div className="progress-label">
              {step?.label || '准备中…'}（第 {step?.index ?? 0} / {step?.total ?? 0} 个场景）
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${(results.length / (step?.total || 1)) * 100}%` }}
              />
            </div>
            <p className="hint">提示词会先被执行模型真实跑一遍，再由评测模型打分，耐心等待…</p>
          </div>
        )}
        {!running && results.length > 0 && (
          <div className="actions-row">
            <button className="btn btn-primary" onClick={run}>🔄 重考一遍</button>
            <button className="btn btn-ghost" onClick={reset}>重新出题 / 换场景</button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      {/* 结果 */}
      {results.length > 0 && (
        <section className="results">
          <div className="results-head">
            <h2>📋 考试成绩</h2>
            {summary && (
              <div className="summary">
                <div className="summary-card">
                  <span className="summary-num">{summary.avg}</span>
                  <span className="summary-label">平均分</span>
                </div>
                <div className="summary-card">
                  <span className="summary-num">{summary.best.eval?.total ?? '—'}</span>
                  <span className="summary-label">最佳场景<br />{summary.best.scenario.title}</span>
                </div>
                <div className="summary-card">
                  <span className="summary-num">{summary.worst.eval?.total ?? '—'}</span>
                  <span className="summary-label">最弱场景<br />{summary.worst.scenario.title}</span>
                </div>
              </div>
            )}
          </div>

          {results.map((r, idx) => (
            <ResultCard key={idx} result={r} />
          ))}
        </section>
      )}
    </div>
  );
}

function ResultCard({ result }) {
  const { scenario, output, eval: ev, rawEval, error } = result;
  const [showOutput, setShowOutput] = useState(false);
  const grade = ev ? gradeOf(ev.total) : null;

  if (error) {
    return (
      <div className="card result-card error-card">
        <div className="result-head">
          <h4>{scenario.title}</h4>
          <span className="badge badge-error">考试失败</span>
        </div>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="card result-card">
        <div className="result-head">
          <h4>{scenario.title}</h4>
          <span className="badge badge-warn">评分解析失败</span>
        </div>
        <p className="hint">评测模型没有返回可解析的评分 JSON。以下是它的原始输出：</p>
        <pre className="raw-output">{rawEval}</pre>
      </div>
    );
  }

  return (
    <div className="card result-card">
      <div className="result-head">
        <div>
          <h4>
            {scenario.title} <span className="scenario-cat">{scenario.category}</span>
          </h4>
          <p className="result-comment">{ev.comment}</p>
        </div>
        <div className="score-badge">
          <span className="score-num">{ev.total}</span>
          <span className="score-max">/ {TOTAL_SCORE}</span>
          <span className="score-grade">{grade.emoji} {grade.label}</span>
        </div>
      </div>

      <div className="criteria">
        {ev.criteria.map((c) => (
          <div key={c.key} className="criterion">
            <div className="criterion-top">
              <span className="criterion-name">{c.name}</span>
              <span className="criterion-score">
                {c.score} / {c.max}
              </span>
            </div>
            <div className="bar">
              <div
                className="bar-fill"
                style={{ width: `${(c.score / c.max) * 100}%` }}
              />
            </div>
            {c.reason && <p className="criterion-reason">{c.reason}</p>}
          </div>
        ))}
      </div>

      {ev.suggestions.length > 0 && (
        <div className="suggestions">
          <h5>💡 提升建议</h5>
          <ul>
            {ev.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn btn-sm toggle-output" onClick={() => setShowOutput((v) => !v)}>
        {showOutput ? '收起' : '展开'}模型实际输出
      </button>
      {showOutput && <pre className="raw-output">{output}</pre>}
    </div>
  );
}
