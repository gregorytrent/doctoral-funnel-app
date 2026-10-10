export const researchResources = [
  { title: "Synthesis and analysis", url: "https://resources.nu.edu/researchtools/synthesisandanalysis" },
  { title: "How to synthesize and analyze", url: "https://resources.nu.edu/researchtools/synthesishowto" },
  { title: "Synthesis practice", url: "https://resources.nu.edu/researchtools/synthesispractice" },
  { title: "Synthesizing a literature review", url: "https://resources.nu.edu/researchtools/synthesizinglitreview" },
  { title: "Research process", url: "https://resources.nu.edu/research" }
];

export const planningFields = [
  ["questions", "Reader questions"],
  ["claims", "Claims to investigate"],
  ["main", "Main claim"],
  ["evidence", "Evidence and citations"],
  ["analysis", "Analysis and alternative explanations"],
  ["link", "Link to the next idea"]
];

export const sourceFields = [
  ["citation", "Citation"], ["url", "DOI or source URL"],
  ["theme", "Theme"], ["population", "Population and setting"],
  ["method", "Method and design"], ["findings", "Findings relevant to the claim"],
  ["limitations", "Limitations and future research"]
];

export function normalizeResearchSupport(project) {
  const planning = {};
  for (const [id, plan] of Object.entries(project.planning && typeof project.planning === "object" ? project.planning : {})) {
    if (!plan || typeof plan !== "object") continue;
    planning[id] = Object.fromEntries(planningFields.map(([key]) => [key, typeof plan[key] === "string" ? plan[key] : ""]));
  }
  const sources = (Array.isArray(project.sources) ? project.sources : [])
    .filter((source) => source && typeof source === "object")
    .map((source, index) => ({
      ...Object.fromEntries([...sourceFields.map(([key]) => key), "type", "position"].map((key) => [key, typeof source[key] === "string" ? source[key] : ""])),
      id: `imported-source-${index}`,
      read: source.read === true
    }));
  return { planning, sources };
}

export function reviewResearchSupport(stageId, plan = {}, sources = []) {
  const feedback = [];
  const prompts = [];
  if (!plan.questions?.trim()) prompts.push("What would a reader unfamiliar with this topic need to know first?");
  if (plan.claims?.trim() && !plan.evidence?.trim()) {
    feedback.push("Your planned claims need supporting evidence; treat them as provisional until checked against sources.");
  }
  if (plan.main?.trim() && !plan.analysis?.trim()) {
    feedback.push("Explain why the evidence supports your main claim and consider alternative explanations.");
  }
  if (plan.evidence?.trim() && !plan.link?.trim()) {
    feedback.push("Add a closing connection that explains how this idea leads to the next funnel stage.");
  }
  if (stageId === "evidence" || stageId === "gap") {
    if (sources.length < 2) {
      prompts.push("Which two sources can you compare under one shared theme?");
      feedback.push("Compare multiple sources before inferring a pattern or a research gap. Source count alone does not establish validity.");
    }
    if (sources.some((source) => !source.citation?.trim() || !source.url?.trim())) {
      feedback.push("Complete the citation and DOI or URL for each source so claims can be traced.");
    }
    if (sources.length && !sources.some((source) => ["challenges", "mixed"].includes(source.position))) {
      prompts.push("What contradicts or qualifies your interpretation, and how do you account for it?");
      feedback.push("The source matrix currently records no challenging or mixed findings. Search for counterevidence and record the outcome, including if none was found.");
    }
    if (sources.some((source) => !source.method?.trim() || !source.limitations?.trim())) {
      feedback.push("Record methods and limitations before attributing conflicting results to a genuine knowledge gap.");
    }
    if (stageId === "gap") prompts.push("Which source limitations support this gap, and what search could disconfirm it?");
    if (!plan.analysis?.trim()) prompts.push("Where do findings agree or differ, and could methods or settings explain the differences?");
  }
  if (stageId === "question") prompts.push("How would your data and design answer this question without presuming the outcome?");
  return { feedback, prompts };
}

export function researchSupportBlueprint(project) {
  const lines = ["", "## Literature Review Planning", ""];
  for (const [stageId, plan] of Object.entries(project.planning || {})) {
    if (!planningFields.some(([key]) => plan[key]?.trim())) continue;
    lines.push(`### ${stageId}`, "");
    for (const [key, label] of planningFields) {
      if (plan[key]?.trim()) lines.push(`${label}: ${plan[key]}`, "");
    }
  }
  lines.push("## Source Synthesis Matrix", "");
  if (!project.sources?.length) lines.push("No sources recorded. Literature verification remains outstanding.");
  for (const [index, source] of (project.sources || []).entries()) {
    lines.push(`### Source ${index + 1}`, "");
    for (const [key, label] of sourceFields) lines.push(`${label}: ${source[key] || "Not recorded"}`);
    lines.push(`Article type: ${source.type || "Not classified"}`);
    lines.push(`Relationship to claim: ${source.position || "Not classified"}`);
    lines.push(`Reading status: ${source.read ? "Marked as read by the user" : "Not yet marked as read"}`);
    lines.push("Verification: Citation, findings, and relevance have not been independently verified by the app.", "");
  }
  lines.push("## Planning Resources", "", "National University guidance informed the planning tools. These guides are not empirical evidence for your dissertation topic.", "");
  for (const resource of researchResources) lines.push(`- [${resource.title}](${resource.url})`);
  return lines.join("\n");
}
