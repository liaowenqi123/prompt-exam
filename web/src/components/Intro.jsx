export default function Intro({ onStart }) {
  return (
    <div className="intro">
      <div className="intro-hero">
        <span className="intro-emoji">📝</span>
        <h2>欢迎来到 Prompt 考试局</h2>
        <p className="intro-desc">
          这里只考一件事：<strong>老板丢给你一句话，你能不能把它变成一条好提示词</strong>。
        </p>
      </div>

      <div className="intro-steps">
        <div className="step">
          <span className="step-num">1</span>
          <p>系统随机出一道题——是老板的原话，永远不把需求讲清楚</p>
        </div>
        <div className="step">
          <span className="step-num">2</span>
          <p>你把这句话变成一条提示词交给 AI：老板没说的地方，你来补</p>
        </div>
        <div className="step">
          <span className="step-num">3</span>
          <p>阅卷官给你的提示词打分 + 针对性点评（不实际执行）</p>
        </div>
      </div>

      <button className="btn btn-primary btn-big" onClick={onStart}>
        🚀 开始考试
      </button>
    </div>
  );
}
