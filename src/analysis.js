import { researchSupportBlueprint } from "./research-support.js";

export const starterExample = {
  discipline: "Business / Human Resource Management",
  projectTitle: "AI Integration, Workforce Transformation, and Change Management",
  answers: {
    domain:
      "Artificial intelligence in human resource management, especially how AI adoption changes HR practices and employee experiences.",
    context:
      "Organizations implementing AI tools for hiring, performance management, workforce planning, and training.",
    problem:
      "Employees may experience job insecurity, resistance, unclear role expectations, and inadequate preparation during AI adoption.",
    evidence:
      "Existing research appears to discuss employee readiness, AI-enabled HRM, organizational change, psychological safety, and reskilling, but I need to verify current empirical sources.",
    gap:
      "The gap may involve limited empirical understanding of how change-management practices influence employee readiness and resistance during AI adoption in HR contexts.",
    question:
      "How do change-management practices influence employee readiness and resistance during AI adoption in HR functions?"
  }
};

export const stages = [
  {
    id: "domain",
    label: "1. Broad Domain",
    shortLabel: "Domain",
    narration:
      "Start wide. Name the scholarly territory you want to enter, but keep it academic rather than personal or merely practical.",
    prompt:
      "What broad doctoral research domain are you entering, and why does it matter as a scholarly area?",
    focus: ["discipline", "major phenomenon", "scholarly importance"],
    adaptivePrompts: [
      "Which discipline or field owns this conversation?",
      "What larger phenomenon would a committee recognize as researchable?",
      "What key populations, organizations, or systems are involved?"
    ]
  },
  {
    id: "context",
    label: "2. Research Context",
    shortLabel: "Context",
    narration:
      "Now place the topic in a real setting. A strong context tells us where the phenomenon happens and who experiences it.",
    prompt:
      "Where does this phenomenon occur, and which population, organization type, or setting will anchor the study?",
    focus: ["setting", "population", "boundaries"],
    adaptivePrompts: [
      "What setting will you study: industry, geography, institution type, role group, or community?",
      "Who directly experiences the issue?",
      "What boundaries keep this project from becoming too large?"
    ]
  },
  {
    id: "problem",
    label: "3. Specific Problem",
    shortLabel: "Problem",
    narration:
      "Move from a topic to a problem. The problem should describe a consequence, tension, or unresolved difficulty worth investigating.",
    prompt:
      "What specific problem or consequence needs investigation in this context?",
    focus: ["problem statement", "affected group", "consequence"],
    adaptivePrompts: [
      "Who is affected by this problem?",
      "What is not working, uncertain, or contested?",
      "What practical or theoretical consequence follows if the problem remains unclear?"
    ]
  },
  {
    id: "evidence",
    label: "4. Scholarly Evidence",
    shortLabel: "Evidence",
    narration:
      "Separate what you know from what you think. Evidence can include theories, empirical findings, and methodological limits, but unsourced claims must be verified.",
    prompt:
      "What scholarly evidence, theories, and empirical findings support the existence of the problem?",
    focus: ["sources", "theory", "empirical pattern", "verification needs"],
    adaptivePrompts: [
      "Which named theory or framework may explain the phenomenon?",
      "What empirical findings support the problem?",
      "Which claims still need source verification?"
    ]
  },
  {
    id: "gap",
    label: "5. Research Gap",
    shortLabel: "Gap",
    narration:
      "The gap is not just an unexplored topic. It is a specific missing, inconsistent, or under-tested piece in the scholarly record.",
    prompt:
      "What precise research gap remains after reviewing the evidence?",
    focus: ["gap type", "missing knowledge", "why prior work is insufficient"],
    adaptivePrompts: [
      "Is the gap about population, context, variables, theory, method, or inconsistent findings?",
      "What has prior research not adequately explained?",
      "How will you verify that this is a real scholarly gap?"
    ]
  },
  {
    id: "question",
    label: "6. Defensible Question",
    shortLabel: "Question",
    narration:
      "End with a question that follows from the gap, names its constructs, and can be answered with a feasible doctoral method.",
    prompt:
      "What focused doctoral research question follows logically from your gap?",
    focus: ["constructs", "relationship", "method fit", "measurability"],
    adaptivePrompts: [
      "What are the central constructs or variables?",
      "What relationship, experience, process, or difference are you investigating?",
      "Could this question be answered with accessible data in a doctoral timeframe?"
    ]
  }
];

const stageWeights = {
  domain: ["discipline", "field", "scholar", "research", "theory", "phenomenon"],
  context: ["organization", "industry", "population", "setting", "sample", "participants", "context"],
  problem: ["problem", "challenge", "impact", "consequence", "barrier", "risk", "affected"],
  evidence: ["study", "research", "empirical", "literature", "theory", "framework", "source", "evidence"],
  gap: ["gap", "limited", "unknown", "underexplored", "inconsistent", "insufficient", "not yet"],
  question: ["how", "what", "why", "relationship", "influence", "affect", "perceive", "experience"]
};

const measurableTerms = [
  "readiness",
  "resistance",
  "adoption",
  "intention",
  "engagement",
  "performance",
  "turnover",
  "satisfaction",
  "trust",
  "perception",
  "experience",
  "frequency",
  "rate",
  "level",
  "score"
];

const assumptionTerms = ["believe", "assume", "obvious", "everyone", "always", "never", "clearly", "proves"];
const sourceTerms = ["doi", "journal", "study", "studies", "article", "author", "year", "theory", "framework", "empirical"];
const verificationTerms = ["verify", "verification", "need source", "needs source", "requires source", "citation needed"];
const methodTerms = ["interview", "survey", "case study", "regression", "qualitative", "quantitative", "mixed", "participants", "sample", "data"];

export function analyzeStage(stageId, answer, allAnswers = {}) {
  const clean = (answer || "").trim();
  const lower = clean.toLowerCase();
  const words = lower.match(/[a-z0-9'-]+/g) || [];
  const uniqueWords = new Set(words);
  const targetTerms = stageWeights[stageId] || [];
  const hits = targetTerms.filter((term) => lower.includes(term));
  const hasMeasurement = measurableTerms.some((term) => lower.includes(term));
  const hasSourceSignal = sourceTerms.some((term) => lower.includes(term));
  const hasVerificationNeed = verificationTerms.some((term) => lower.includes(term));
  const hasAssumptionSignal = assumptionTerms.some((term) => lower.includes(term));
  const hasMethodSignal = methodTerms.some((term) => lower.includes(term));
  const hasQuestionShape = /\?$/.test(clean) || /^(how|what|why|to what extent|in what ways)\b/i.test(clean);
  const specificSignals = [/\b(in|among|within|for)\b/i, /\bemployees?|leaders?|students?|patients?|managers?|organizations?|participants?\b/i, /\bAI\b|artificial intelligence|technology|policy|program|intervention/i].filter((regex) =>
    regex.test(clean)
  ).length;

  const metrics = {
    completeness: Math.min(100, Math.round((words.length / 65) * 100)),
    specificity: Math.min(100, Math.round((specificSignals / 3) * 100 + Math.min(uniqueWords.size, 35))),
    stageFit: Math.min(100, Math.round((hits.length / Math.max(targetTerms.length, 1)) * 100 + (words.length > 25 ? 20 : 0))),
    evidenceDiscipline: stageId === "evidence" || stageId === "gap" ? (hasSourceSignal ? 78 : 34) : hasAssumptionSignal ? 48 : 72,
    measurability: stageId === "question" || stageId === "problem" || stageId === "gap" ? (hasMeasurement ? 78 : 42) : 68,
    feasibility: stageId === "question" ? (hasMethodSignal || hasMeasurement ? 74 : 45) : hasMethodSignal ? 76 : 64
  };

  const score = Math.round(
    metrics.completeness * 0.18 +
      metrics.specificity * 0.2 +
      metrics.stageFit * 0.2 +
      metrics.evidenceDiscipline * 0.16 +
      metrics.measurability * 0.14 +
      metrics.feasibility * 0.12
  );

  const strengths = [];
  const cautions = [];
  const actions = [];

  if (words.length >= 35) strengths.push("Provides enough substance for review rather than a label.");
  else actions.push("Add two or three sentences that name the setting, people, and scholarly issue.");

  if (specificSignals >= 2) strengths.push("Includes useful boundaries around setting, population, or phenomenon.");
  else cautions.push("The answer is still broad; it may be difficult to defend as a doctoral study boundary.");

  if (hits.length >= 2) strengths.push("The answer fits the current funnel stage.");
  else actions.push(`Tie the answer more directly to this stage: ${targetTerms.slice(0, 4).join(", ")}.`);

  if (hasAssumptionSignal) cautions.push("Some wording sounds assumption-led; convert broad claims into verifiable claims.");
  if (stageId === "evidence" || stageId === "gap") {
    cautions.push("Citation wording does not verify a claim. Check the original sources and document how they support this interpretation.");
    if (hasVerificationNeed) actions.push("Resolve the verification needs you identified before relying on these claims.");
  }
  if ((stageId === "evidence" || stageId === "gap") && !hasSourceSignal) {
    cautions.push("This stage needs source verification before it can be treated as scholarly evidence.");
    actions.push("Mark at least one claim for literature verification and later attach sources.");
  }
  if ((stageId === "problem" || stageId === "gap" || stageId === "question") && !hasMeasurement) {
    actions.push("Name observable constructs or variables so the study can be measured or systematically interpreted.");
  }
  if (stageId === "question" && !hasQuestionShape) actions.push("Rewrite this as a clear research question beginning with how, what, why, or to what extent.");
  if (stageId === "question" && !hasMethodSignal) actions.push("Add a likely method or data source to test feasibility.");

  const alignment = analyzeAlignment(stageId, clean, allAnswers);

  return {
    score: Math.max(18, Math.min(96, score)),
    metrics,
    strengths,
    cautions,
    actions,
    alignment,
    verificationRequired: stageId === "evidence" || stageId === "gap"
  };
}

export function analyzeAlignment(stageId, answer, allAnswers = {}) {
  const previousIds = stages.map((stage) => stage.id).slice(0, stages.findIndex((stage) => stage.id === stageId));
  if (!answer || previousIds.length === 0) {
    return { score: 70, message: "First stage sets the foundation for later alignment." };
  }

  const answerTokens = keywordSet(answer);
  const priorTokens = new Set(previousIds.flatMap((id) => [...keywordSet(allAnswers[id] || "")]));
  const overlap = [...answerTokens].filter((token) => priorTokens.has(token));
  const score = Math.min(96, Math.round(42 + overlap.length * 9));

  if (overlap.length >= 5) {
    return { score, message: "Strong continuity with earlier funnel answers." };
  }
  if (overlap.length >= 2) {
    return { score, message: "Some continuity is visible; make the construct chain more explicit." };
  }
  return {
    score,
    message: "This answer may be drifting from earlier stages. Reuse the same core constructs unless the pivot is intentional."
  };
}

export function analyzeProject(answers = {}) {
  const stageResults = Object.fromEntries(stages.map((stage) => [stage.id, analyzeStage(stage.id, answers[stage.id], answers)]));
  const scores = Object.values(stageResults).map((result) => result.score);
  const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const blockers = [];
  const recommendations = [];

  stages.forEach((stage) => {
    const result = stageResults[stage.id];
    if (!answers[stage.id]?.trim()) blockers.push(`${stage.shortLabel} is incomplete.`);
    if (result.verificationRequired) blockers.push(`${stage.shortLabel} contains claims that require literature verification.`);
    if (result.score < 58) recommendations.push(`Revise ${stage.shortLabel}: ${result.actions[0] || "add more specificity."}`);
  });

  const question = answers.question || "";
  if (question && !/^(how|what|why|to what extent|in what ways)\b/i.test(question.trim())) {
    recommendations.push("Shape the final item as an explicit research question.");
  }

  return {
    average,
    stageResults,
    readiness:
      average >= 78 && blockers.length === 0
        ? "Structural signals are strong; advisor review is still required."
        : average >= 62
          ? "Structural signals are present; evidence verification and advisor review remain."
          : "Blueprint needs stronger boundaries, evidence, and construct alignment.",
    blockers,
    recommendations
  };
}

export function buildBlueprint(project) {
  const answers = project.answers || {};
  const projectAnalysis = analyzeProject(answers);
  const lines = [
    `# ${project.projectTitle || "Doctoral Research Blueprint"}`,
    "",
    `Discipline: ${project.discipline || "Not specified"}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Overall readiness: ${projectAnalysis.average}/100 - ${projectAnalysis.readiness}`,
    "",
    "## Funnel Stages",
    ""
  ];

  stages.forEach((stage) => {
    const result = projectAnalysis.stageResults[stage.id];
    lines.push(`### ${stage.label}`);
    lines.push(answers[stage.id]?.trim() || "_No answer yet._");
    lines.push("");
    lines.push(`Analysis score: ${result.score}/100`);
    if (result.strengths.length) lines.push(`Strengths: ${result.strengths.join(" ")}`);
    if (result.cautions.length) lines.push(`Cautions: ${result.cautions.join(" ")}`);
    if (result.actions.length) lines.push(`Next actions: ${result.actions.join(" ")}`);
    if (result.verificationRequired) {
      lines.push("Verification flag: Do not claim this as established literature until sources are attached and reviewed.");
    }
    lines.push("");
  });

  lines.push("## Research Blueprint Checks");
  lines.push("");
  lines.push(`Logic and progression: ${projectAnalysis.readiness}`);
  lines.push(
    `Evidence discipline: ${projectAnalysis.blockers.length ? projectAnalysis.blockers.join(" ") : "No major verification blockers identified by the app."}`
  );
  lines.push(
    "Important limitation: This app provides structured reasoning feedback. It does not verify literature claims or replace advisor review."
  );
  lines.push("");
  lines.push("## Suggested Next Step");
  lines.push("");
  lines.push(projectAnalysis.recommendations[0] || "Attach verified peer-reviewed sources and refine the methodology section.");

  return lines.join("\n") + researchSupportBlueprint(project);
}

function keywordSet(text) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "how",
    "what",
    "why",
    "are",
    "will",
    "can",
    "may",
    "not",
    "study",
    "research"
  ]);
  return new Set(
    (text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) || [])
      .filter((token) => !stop.has(token))
      .slice(0, 80)
  );
}
