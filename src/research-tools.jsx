import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { planningFields, researchResources, sourceFields } from "./research-support.js";

export function StagePlanning({ plan, onChange }) {
  return (
    <details className="research-planning">
      <summary>Literature review planning</summary>
      <div className="planning-grid">
        {planningFields.map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea value={plan[key] || ""} onChange={(event) => onChange(key, event.target.value)} />
          </label>
        ))}
      </div>
    </details>
  );
}

export function SourceMatrix({ sources, onChange }) {
  function updateSource(id, key, value) {
    onChange(sources.map((source) => source.id === id ? { ...source, [key]: value } : source));
  }
  return (
    <section className="source-matrix" aria-labelledby="matrix-title">
      <div className="matrix-heading">
        <div>
          <p className="eyebrow">Evidence workspace</p>
          <h2 id="matrix-title">Source synthesis matrix</h2>
        </div>
        <button type="button" onClick={() => onChange([...sources, { id: crypto.randomUUID(), type: "", position: "", read: false }])}>
          <Plus aria-hidden="true" /> Add source
        </button>
      </div>
      {sources.length === 0 && <p className="source-status">No sources recorded. Literature verification is outstanding.</p>}
      {sources.map((source, index) => (
        <article key={source.id} className="source-row">
          <div className="matrix-heading">
            <h3>Source {index + 1}</h3>
            <button type="button" className="ghost icon-only" title={`Remove source ${index + 1}`} aria-label={`Remove source ${index + 1}`} onClick={() => onChange(sources.filter((item) => item.id !== source.id))}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
          <div className="planning-grid">
            {sourceFields.map(([key, label]) => (
              <label key={key}>{label}
                {["findings", "limitations"].includes(key)
                  ? <textarea value={source[key] || ""} onChange={(event) => updateSource(source.id, key, event.target.value)} />
                  : <input value={source[key] || ""} onChange={(event) => updateSource(source.id, key, event.target.value)} />}
              </label>
            ))}
            <label>Article type
              <select value={source.type || ""} onChange={(event) => updateSource(source.id, "type", event.target.value)}>
                <option value="">Not classified</option>
                <option value="empirical">Empirical study</option>
                <option value="review">Literature review</option>
                <option value="theoretical">Theoretical / conceptual</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Relationship to claim
              <select value={source.position || ""} onChange={(event) => updateSource(source.id, "position", event.target.value)}>
                <option value="">Not classified</option>
                <option value="supports">Supports</option>
                <option value="challenges">Challenges</option>
                <option value="mixed">Mixed / qualifies</option>
                <option value="background">Background</option>
              </select>
            </label>
            <label className="read-checkbox">
              <input type="checkbox" checked={!!source.read} onChange={(event) => updateSource(source.id, "read", event.target.checked)} />
              I have read this source
            </label>
          </div>
          <p className="source-status">User-entered source. Citation and findings are not independently verified.</p>
        </article>
      ))}
      <details className="research-planning">
        <summary>National University resources</summary>
        <ul>{researchResources.map((resource) => <li key={resource.url}><a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a></li>)}</ul>
      </details>
    </section>
  );
}
