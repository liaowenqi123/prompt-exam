import { useState } from 'react';
import ConfigModal from './components/ConfigModal.jsx';
import Intro from './components/Intro.jsx';
import Exam from './components/Exam.jsx';
import { loadConfig, isConfigured } from './config.js';

export default function App() {
  const [config, setConfig] = useState(() => loadConfig());
  const [started, setStarted] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const configured = isConfigured(config);

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => setStarted(false)}>
          <span className="brand-logo">📝</span>
          <div>
            <h1>Prompt 考试局</h1>
            <p>看看你会不会跟 AI 好好说话</p>
          </div>
        </div>
        <div className="header-right">
          <span className={`config-status ${configured ? 'ok' : 'warn'}`}>
            <i className="dot" />
            {configured ? '模型已就位' : '还没配模型'}
          </span>
          <button className="btn btn-ghost" onClick={() => setShowConfig(true)}>
            ⚙️ 模型配置
          </button>
        </div>
      </header>

      <main className="main">
        {started ? (
          <Exam config={config} onExit={() => setStarted(false)} />
        ) : (
          <Intro
            configured={configured}
            onStart={() => setStarted(true)}
            onOpenConfig={() => setShowConfig(true)}
          />
        )}
      </main>

      <footer className="footer">
        Prompt 考试局 · 用真实任务 + AI 阅卷官，检验你的提示词 · API Key 只存在浏览器本地
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
