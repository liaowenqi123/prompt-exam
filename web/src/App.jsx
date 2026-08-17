import { useState } from 'react';
import Intro from './components/Intro.jsx';
import Exam from './components/Exam.jsx';
import { JUDGE_CONFIG } from './config.js';

export default function App() {
  const [started, setStarted] = useState(false);

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
      </header>

      <main className="main">
        {started ? (
          <Exam config={JUDGE_CONFIG} onExit={() => setStarted(false)} />
        ) : (
          <Intro onStart={() => setStarted(true)} />
        )}
      </main>

      <footer className="footer">
        Prompt 考试局 · 用真实任务 + AI 阅卷官，检验你的提示词
      </footer>
    </div>
  );
}
