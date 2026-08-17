import { useState } from 'react';
import { PRESETS, saveConfig } from '../config.js';

const FIELDS = [
  {
    key: 'exec',
    title: '执行模型（负责按你的提示词完成场景任务）',
    fields: [
      { name: 'execBaseURL', label: 'API 地址 (baseURL)', placeholder: 'https://api.deepseek.com/v1', type: 'text' },
      { name: 'execApiKey', label: 'API Key', placeholder: 'sk-...', type: 'password' },
      { name: 'execModel', label: '模型名', placeholder: 'deepseek-chat', type: 'text' },
    ],
  },
  {
    key: 'eval',
    title: '评测模型（负责按评分标准给你的提示词打分）',
    fields: [
      { name: 'evalBaseURL', label: 'API 地址 (baseURL)', placeholder: 'https://api.deepseek.com/v1', type: 'text' },
      { name: 'evalApiKey', label: 'API Key', placeholder: 'sk-...', type: 'password' },
      { name: 'evalModel', label: '模型名', placeholder: 'deepseek-chat', type: 'text' },
    ],
  },
];

export default function ConfigModal({ config, onSave, onClose }) {
  const [form, setForm] = useState({ ...config });

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const applyPreset = (preset) => {
    setForm({ ...preset.config });
  };

  const submit = () => {
    saveConfig(form);
    onSave(form);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>⚙️ 模型配置</h2>
          <button className="btn-icon" onClick={onClose} title="关闭">✕</button>
        </div>

        <div className="preset-row">
          <span className="preset-label">快速预设：</span>
          {PRESETS.map((p) => (
            <button key={p.id} className="btn btn-sm" onClick={() => applyPreset(p)}>
              {p.name}
            </button>
          ))}
        </div>
        {PRESETS.map((p) => (
          <p key={p.id} className="preset-desc">{p.desc}</p>
        ))}

        {FIELDS.map((group) => (
          <fieldset key={group.key} className="fieldset">
            <legend>{group.title}</legend>
            {group.fields.map((f) => (
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
          </fieldset>
        ))}

        <p className="hint">
          你的 API Key 只保存在浏览器本地（localStorage），不会发送到本项目服务器之外的地方。
          本机 LM Studio 测试可不用真实 Key。
        </p>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={submit}>保存配置</button>
        </div>
      </div>
    </div>
  );
}
