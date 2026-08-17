export default function Intro({ configured, onStart, onOpenConfig }) {
  return (
    <div className="intro">
      <div className="intro-hero">
        <span className="intro-emoji">📝</span>
        <h2>欢迎来到 Prompt 考试局</h2>
        <p className="intro-desc">
          这里不考别的，就考一件事：<strong>你会不会跟 AI 好好说话</strong>。
        </p>
      </div>

      <div className="intro-steps">
        <div className="step">
          <span className="step-num">1</span>
          <p>系统随机抽一道真实任务题（比如给咖啡店写开业文案）</p>
        </div>
        <div className="step">
          <span className="step-num">2</span>
          <p>你像平常聊天一样，写一条提示词交给 AI</p>
        </div>
        <div className="step">
          <span className="step-num">3</span>
          <p>AI 真的按你的提示词去干活，阅卷官打分 + 给你针对性点评</p>
        </div>
      </div>

      <button className="btn btn-primary btn-big" onClick={onStart}>
        🚀 开始考试
      </button>

      {!configured && (
        <p className="intro-hint">
          还没配模型，点
          <button className="link" onClick={onOpenConfig}>⚙️ 模型配置</button>
          填好（默认 DeepSeek，本地测试可点「本地测试（LM Studio）」预设）
        </p>
      )}
    </div>
  );
}
