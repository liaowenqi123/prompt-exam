import { useState } from 'react';
import { PRESETS, saveConfig } from '../config.js';

const FIELDS = [
  { name: 'baseURL', label: 'API 地址 (baseURL)', placeholder: 'https://api.deepseek.com/v1', type: 'text' },
  { name: 'apiKey', label: 'API Key', placeholder: 'sk-...', type: 'password' },
  { name: 'model', label: '模型名', placeholder: 'deepseek-chat', type: 'text' },
];

export default function ConfigModal({ config, onSave, onClose }) {
  const [form, setForm] = useState({ ...config });

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const submit = () => {
    saveConfig(form);
    onSave(form);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>⚙️ 阅卷模型配置</h2>
          <button className="btn-icon" onClick={onClose} title="关闭">✕</button>
        </div>

        <div className="preset-row">
          <span className="preset-label">快速预设：</span>
          {PRESETS.map((p) => (
            <button key={p.id} className="btn btn-sm" onClick={() => setForm({ ...p.config })}>
              {p.name}
            </button>
          ))}
        </div>
        {PRESETS.map((p) => (
          <p key={p.id} className="preset-desc">{p.desc}</p>
        ))}

        <fieldset className="fieldset">
          <legend>阅卷模型（负责打分 + 点评，纯主观判卷）</legend>
          {FIELDS.map((f) => (
            <label key={f.name} className="field">
              <span className="field-label">{f.label}</span>
              <input
                type={f.type}
                value={form[f.name] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => set(f.name, e.target.value)}
              />
            </label>
          ))}
          <label className="field check-field">
            <input
              type="checkbox"
              checked={Boolean(form.disableThinking)}
              onChange={(e) => set('disableThinking', e.target.checked)}
            />
            <span>关闭模型思考（本地小模型会更快直接出结果；DeepSeek 等云端模型不要开）</span>
          </label>
        </fieldset>

        <p className="hint">
          你的 API Key 只保存在浏览器本地（localStorage）。本机 LM Studio 测试可不用真实 Key。
          考试只做主观判卷、不会执行你的提示词，所以本地用一个最小的模型（如 0.8B）就够，谁用都不花钱。
        </p>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={submit}>保存配置</button>
        </div>
      </div>
    </div>
  );
}
