import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Download,
  FileText,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Volume2,
  VolumeX
} from "lucide-react";
import { analyzeProject, analyzeStage, buildBlueprint, stages, starterExample } from "./analysis.js";
import { normalizeResearchSupport, reviewResearchSupport } from "./research-support.js";
import { SourceMatrix, StagePlanning } from "./research-tools.jsx";
import { createCloudNarrator } from "./narration.js";
import "./styles.css";

const storageKey = "doctoral-funnel-app.project.v1";
const narrationEndpoint = import.meta.env.VITE_NARRATION_URL || "";

const emptyProject = {
  discipline: "",
  projectTitle: "Untitled Doctoral Funnel",
  answers: Object.fromEntries(stages.map((stage) => [stage.id, ""])),
  notes: "",
  planning: {},
  sources: []
};

function App() {
  const [project, setProject] = useState(loadProject);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState(() => localStorage.getItem("doctoral-funnel.voice") || "");
  const [speechRate, setSpeechRate] = useState(() => Number(localStorage.getItem("doctoral-funnel.speechRate")) || 0.9);
  const [narrationMode, setNarrationMode] = useState(() => narrationEndpoint && localStorage.getItem("doctoral-funnel.narrationMode") !== "browser" ? "marin" : "browser");
  const [narrationStatus, setNarrationStatus] = useState("");
  const [notice, setNotice] = useState("");
  const recognitionRef = useRef(null);
  const cloudRef = useRef(null);
  const speechRequestRef = useRef(0);
  if (!cloudRef.current) cloudRef.current = createCloudNarrator({ endpoint: narrationEndpoint });

  const activeStage = stages[activeIndex];
  const activeAnswer = project.answers[activeStage.id] || "";
  const activePlan = project.planning?.[activeStage.id] || {};
  const sources = project.sources || [];
  const researchReview = reviewResearchSupport(activeStage.id, activePlan, sources);
  const adaptivePrompts = [...researchReview.prompts, ...activeStage.adaptivePrompts].slice(0, 5);
  const stageAnalysis = useMemo(
    () => analyzeStage(activeStage.id, activeAnswer, project.answers),
    [activeStage.id, activeAnswer, project.answers]
  );
  const projectAnalysis = useMemo(() => analyzeProject(project.answers), [project.answers]);
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const recognitionSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    if (!speechSupported) return;
    const refreshVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const quality = (voice) =>
        (/natural|neural|enhanced|premium/i.test(voice.name) ? 100 : 0) +
        (/google|microsoft|samantha|ava|allison|serena/i.test(voice.name) ? 20 : 0) +
        (/^en-US$/i.test(voice.lang) ? 10 : 0);
      setVoices(available.filter((voice) => /^en[-_]/i.test(voice.lang))
        .sort((a, b) => quality(b) - quality(a) || a.name.localeCompare(b.name)));
    };
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
  }, [speechSupported]);

  useEffect(() => {
    localStorage.setItem("doctoral-funnel.voice", voiceURI);
    localStorage.setItem("doctoral-funnel.speechRate", String(speechRate));
  }, [voiceURI, speechRate]);

  useEffect(() => {
    localStorage.setItem("doctoral-funnel.narrationMode", narrationMode);
  }, [narrationMode]);

  useEffect(() => {
    if (muted) stopSpeaking();
  }, [muted]);

  useEffect(() => {
    if (!muted) speakStage(activeStage, false);
    return stopSpeaking;
  }, [activeIndex]);

  function updateAnswer(value) {
    setProject((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [activeStage.id]: value
      }
    }));
  }

  async function speakStage(stage, includeAnalysis = true) {
    if (muted) return;
    stopSpeaking();
    const request = speechRequestRef.current;
    if (narrationMode === "marin" && narrationEndpoint) {
      setNarrationStatus("Preparing Marin narration...");
      setIsSpeaking(true);
      const result = await cloudRef.current.play(stage.id, speechRate, (error) => {
        setIsSpeaking(false);
        setNarrationStatus(error ? "Audio playback failed. Replay to try again." : "");
      });
      if (request !== speechRequestRef.current) return;
      if (result === "playing") { setNarrationStatus("Marin · AI-generated stage narration"); return; }
      setIsSpeaking(false);
      if (result === "cancelled") return;
      if (result === "blocked") { setNarrationStatus("Press replay to start narration."); return; }
      setNarrationStatus(speechSupported ? "Marin is unavailable. Using the browser voice for this prompt." : "Marin is unavailable. Please read the prompt above.");
    }
    if (!speechSupported) return;
    const analysisText =
      includeAnalysis && activeStage.id === stage.id
        ? `${researchReview.feedback[0] || stageAnalysis.actions[0] || "Continue refining your answer."} ${researchReview.prompts[0] || ""}`
        : "";
    const utterance = new SpeechSynthesisUtterance(`${stage.narration} ${stage.prompt} ${analysisText}`);
    const selectedVoice = voices.find((voice) => voice.voiceURI === voiceURI) || voices[0];
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || "en-US";
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.onstart = () => { if (request === speechRequestRef.current) setIsSpeaking(true); };
    utterance.onend = () => { if (request === speechRequestRef.current) setIsSpeaking(false); };
    utterance.onerror = () => { if (request === speechRequestRef.current) setIsSpeaking(false); };
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    speechRequestRef.current += 1;
    cloudRef.current?.stop();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setNarrationStatus("");
  }

  function toggleListening() {
    if (!recognitionSupported) {
      setNotice("Voice answers are not supported in this browser. Typed answers still work.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onerror = () => {
      setIsListening(false);
      setNotice("I could not capture that voice answer. Try again or type it in.");
    };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      updateAnswer(`${activeAnswer}${activeAnswer ? " " : ""}${transcript}`.trim());
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function loadStarter() {
    setProject({
      ...emptyProject,
      discipline: starterExample.discipline,
      projectTitle: starterExample.projectTitle,
      answers: { ...emptyProject.answers, ...starterExample.answers },
      notes: "Starter example loaded. Replace any field with your own doctoral topic."
    });
    setActiveIndex(0);
    setNotice("AI-in-HR starter example loaded. You can revise every stage.");
  }

  function resetProject() {
    stopSpeaking();
    setProject(emptyProject);
    setActiveIndex(0);
    setNotice("Project reset.");
  }

  function exportBlueprint() {
    const blueprint = buildBlueprint(project);
    const blob = new Blob([blueprint], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(project.projectTitle || "doctoral-funnel-blueprint")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Research blueprint exported as Markdown.");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ ...project, analysis: projectAnalysis }, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(project.projectTitle || "doctoral-funnel-project")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Project exported as JSON.");
  }

  function importProject(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setProject({
          ...emptyProject,
          ...parsed,
          ...normalizeResearchSupport(parsed),
          answers: { ...emptyProject.answers, ...(parsed.answers || {}) }
        });
        setActiveIndex(0);
        setNotice("Project imported.");
      } catch {
        setNotice("That file was not a valid Doctoral Funnel project export.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Project controls">
        <div>
          <p className="eyebrow">Doctoral Funnel App</p>
          <h1>Build a defensible research question, one stage at a time.</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={loadStarter}>
            <Sparkles aria-hidden="true" />
            AI-in-HR starter
          </button>
          <button type="button" className="ghost icon-only" onClick={() => setMuted((value) => !value)} title={muted ? "Unmute narration" : "Mute narration"} aria-label={muted ? "Unmute narration" : "Mute narration"}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
        </div>
      </section>

      <section className="workspace">
        <aside className="funnel-panel" aria-label="Research funnel stages">
          <div className="funnel-visual" role="list">
            {stages.map((stage, index) => {
              const result = analyzeStage(stage.id, project.answers[stage.id], project.answers);
              return (
                <button
                  key={stage.id}
                  type="button"
                  role="listitem"
                  className={`funnel-slice ${index === activeIndex ? "active" : ""}`}
                  style={{ "--slice": index }}
                  onClick={() => setActiveIndex(index)}
                >
                  <span>{stage.shortLabel}</span>
                  <strong>{result.score}</strong>
                </button>
              );
            })}
          </div>
          <div className="readiness">
            <span>Overall readiness</span>
            <strong>{projectAnalysis.average}/100</strong>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${projectAnalysis.average}%` }} />
            </div>
            <p>{projectAnalysis.readiness}</p>
          </div>
        </aside>

        <section className="stage-panel" aria-labelledby="stage-title">
          <div className="project-fields">
            <label>
              Project title
              <input
                value={project.projectTitle}
                onChange={(event) => setProject((current) => ({ ...current, projectTitle: event.target.value }))}
              />
            </label>
            <label>
              Discipline
              <input
                value={project.discipline}
                onChange={(event) => setProject((current) => ({ ...current, discipline: event.target.value }))}
                placeholder="e.g., Education, Nursing, Business, Psychology"
              />
            </label>
          </div>

          <div className="stage-heading">
            <div>
              <p className="eyebrow">{activeStage.label}</p>
              <h2 id="stage-title">{activeStage.prompt}</h2>
            </div>
            <div className="audio-controls">
              <button type="button" className="icon-only" onClick={() => speakStage(activeStage)} title="Replay spoken prompt" aria-label="Replay spoken prompt">
                <Play aria-hidden="true" />
              </button>
              <button type="button" className="icon-only" onClick={stopSpeaking} title="Stop narration" aria-label="Stop narration">
                {isSpeaking ? <Pause aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              </button>
            </div>
          </div>

          {(speechSupported || narrationEndpoint) && (
            <div className="project-fields" aria-label="Narration preferences">
              <label>
                Narration
                <select value={narrationMode} onChange={(event) => { stopSpeaking(); setNarrationMode(event.target.value); }}>
                  <option value="marin" disabled={!narrationEndpoint}>Marin · AI voice{!narrationEndpoint ? " (awaiting connection)" : ""}</option>
                  <option value="browser">Browser voice</option>
                </select>
              </label>
              {narrationMode === "browser" && speechSupported && (
              <label>
                Narrator voice
                <select value={voiceURI} onChange={(event) => { stopSpeaking(); setVoiceURI(event.target.value); }}>
                  <option value="">Automatic{voices[0] ? ` (${voices[0].name})` : ""}</option>
                  {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
                </select>
              </label>
              )}
              <label>
                Speaking pace: {speechRate.toFixed(2)}x
                <input type="range" min="0.7" max="1.15" step="0.05" value={speechRate} onChange={(event) => { stopSpeaking(); setSpeechRate(Number(event.target.value)); }} />
              </label>
            </div>
          )}
          {narrationStatus && <p role="status">{narrationStatus}</p>}

          <div className="prompt-strip" aria-label="Adaptive prompts">
            {adaptivePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => updateAnswer(`${activeAnswer}${activeAnswer ? "\n\n" : ""}${prompt} `)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <label className="answer-box">
            Your answer
            <textarea
              value={activeAnswer}
              onChange={(event) => updateAnswer(event.target.value)}
              placeholder="Think aloud here. The app will test whether the answer is specific, coherent, evidence-aware, measurable, and aligned with the funnel."
            />
          </label>

          <div className="stage-actions">
            <button type="button" className="ghost" onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0}>
              <ArrowLeft aria-hidden="true" />
              Back
            </button>
            <button type="button" className={isListening ? "danger" : "ghost"} onClick={toggleListening}>
              {isListening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
              {isListening ? "Stop voice" : "Voice answer"}
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex(Math.min(stages.length - 1, activeIndex + 1))}
              disabled={activeIndex === stages.length - 1}
            >
              Next
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <StagePlanning plan={activePlan} onChange={(key, value) => setProject((current) => ({
            ...current,
            planning: { ...current.planning, [activeStage.id]: { ...activePlan, [key]: value } }
          }))} />
        </section>

        <aside className="analysis-panel" aria-label="Answer analysis">
          <div className="score-card">
            <span>Structural score (heuristic)</span>
            <strong>{stageAnalysis.score}/100</strong>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${stageAnalysis.score}%` }} />
            </div>
          </div>

          <MetricGrid metrics={stageAnalysis.metrics} />

          <Feedback title="Strengths" items={stageAnalysis.strengths} empty="No strengths detected yet. Add more substance and boundaries." />
          <Feedback title="Cautions" items={stageAnalysis.cautions} empty="No major cautions at this stage." />
          <Feedback title="Actionable revisions" items={stageAnalysis.actions} empty="This answer is ready to move forward for now." />
          {researchReview.feedback.length > 0 && <Feedback title="Synthesis review" items={researchReview.feedback} />}

          <div className="alignment-card">
            <BookOpenCheck aria-hidden="true" />
            <div>
              <strong>Alignment check: {stageAnalysis.alignment.score}/100</strong>
              <p>{stageAnalysis.alignment.message}</p>
            </div>
          </div>

          <div className="export-actions">
            <button type="button" onClick={exportBlueprint}>
              <Download aria-hidden="true" />
              Blueprint
            </button>
            <button type="button" className="ghost" onClick={exportJson}>
              <Save aria-hidden="true" />
              Project file
            </button>
            <label className="file-import">
              <FileText aria-hidden="true" />
              Import
              <input type="file" accept="application/json" onChange={importProject} />
            </label>
            <button type="button" className="ghost" onClick={resetProject}>
              <RotateCcw aria-hidden="true" />
              Reset
            </button>
          </div>
        </aside>
      </section>

      <SourceMatrix sources={sources} onChange={(nextSources) => setProject((current) => ({ ...current, sources: nextSources }))} />

      <section className="blueprint-preview" aria-label="Research blueprint preview">
        <div>
          <p className="eyebrow">Blueprint preview</p>
          <h2>What your committee logic currently says</h2>
        </div>
        <div className="blueprint-grid">
          {stages.map((stage) => (
            <article key={stage.id}>
              <span>{stage.label}</span>
              <p>{project.answers[stage.id] || "Not answered yet."}</p>
            </article>
          ))}
        </div>
        {projectAnalysis.blockers.length > 0 && (
          <div className="verification-warning">
            <strong>Verification needed</strong>
            <p>{projectAnalysis.blockers.join(" ")}</p>
          </div>
        )}
      </section>

      <div className="toast" role="status" aria-live="polite">
        {notice}
      </div>
    </main>
  );
}

function MetricGrid({ metrics }) {
  const labels = {
    completeness: "Completeness",
    specificity: "Specificity",
    stageFit: "Stage fit",
    evidenceDiscipline: "Evidence discipline",
    measurability: "Measurability",
    feasibility: "Feasibility"
  };
  return (
    <div className="metric-grid">
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key}>
          <span>{labels[key]}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Feedback({ title, items, empty }) {
  return (
    <section className="feedback-block">
      <h3>{title}</h3>
      <ul>
        {(items.length ? items : [empty]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function loadProject() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return emptyProject;
    const parsed = JSON.parse(saved);
    return {
      ...emptyProject,
      ...parsed,
      ...normalizeResearchSupport(parsed),
      answers: { ...emptyProject.answers, ...(parsed.answers || {}) }
    };
  } catch {
    return emptyProject;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

createRoot(document.getElementById("root")).render(<App />);
