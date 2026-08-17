import { useEffect, useState } from 'react';
import ConfigModal from './components/ConfigModal.jsx';
import TestView from './components/TestView.jsx';
import RubricView from './components/RubricView.jsx';
import { loadConfig, isConfigured } from './config.js';

export default function App() {
  const [config, setConfig] = useState(() => loadConfig());
  const [tab, setTab] = useState('test');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (!showConfig) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowConfig(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfig]);

  const configured = isConfigured(config);

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => setTab('test')}>
          <span className="brand-logo">✍️</span>
          <div>
            <h1>Prompt Exam</h1>
            <p>提示词考试 · 用真实场景和大模型评分，检验你的提示词</p>
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === 'test' ? 'tab active' : 'tab'} onClick={() => setTab('test')}>
            开始考试
          </button>
          <button className={tab === 'rubric' ? 'tab active' : 'tab'} onClick={() => setTab('rubric')}>
            评分标准
          </button>
        </nav>
        <div className="header-right">
          <span className={`config-status ${configured ? 'ok' : 'warn'}`}>
            <i className="dot" />
            {configured ? '模型已配置' : '未配置模型'}
          </span>
          <button className="btn btn-ghost" onClick={() => setShowConfig(true)}>
            ⚙️ 模型配置
          </button>
        </div>
      </header>

      <main className="main">
        {tab === 'test' ? (
          <TestView config={config} />
        ) : (
          <RubricView />
        )}
      </main>

      <footer className="footer">
        Prompt Exam · 让"提示词大师"心服口服 · 你的 API Key 仅保存在浏览器本地
      </footer>

      {showConfig && (
        <ConfigModal
          config={config}
          onSave={(next) => {
            setConfig(next);
            setShowConfig(false);
          }}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
