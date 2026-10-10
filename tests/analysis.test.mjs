import assert from "node:assert/strict";
import { analyzeProject, analyzeStage, buildBlueprint, starterExample } from "../src/analysis.js";
import { normalizeResearchSupport, reviewResearchSupport } from "../src/research-support.js";

const weak = analyzeStage("gap", "AI is important and everyone knows companies need it.", {});
assert.ok(weak.score < 65, "weak unsourced gap should not score as ready");
assert.equal(weak.verificationRequired, true, "gap claims without source signals should require verification");
assert.ok(weak.actions.length > 0, "weak answer should produce actions");

const project = analyzeProject(starterExample.answers);
assert.ok(project.average > 50, "starter project should be workable enough to review");
assert.ok(project.blockers.some((item) => item.includes("verification")), "starter should flag literature verification");

const blueprint = buildBlueprint(starterExample);
assert.match(blueprint, /Doctoral Research Blueprint|AI Integration/);
assert.match(blueprint, /Verification flag|Verification needed|Verification/);

assert.equal(analyzeStage("evidence", "Empirical studies in a journal prove this theory.").verificationRequired, true,
  "source-like words must never count as verified evidence");
const support = normalizeResearchSupport({ sources: [null, { citation: "Example (2026)", read: true }], planning: { evidence: { main: "Claim", analysis: 4 } } });
assert.equal(support.sources.length, 1);
assert.equal(support.planning.evidence.analysis, "");
assert.deepEqual(normalizeResearchSupport({ sources: "invalid" }).sources, []);
const review = reviewResearchSupport("gap", { claims: "Claim" }, support.sources);
assert.ok(review.feedback.some((item) => item.includes("counterevidence")));
assert.ok(review.prompts.some((item) => item.includes("disconfirm")));
const enriched = buildBlueprint({ ...starterExample, ...support });
assert.match(enriched, /Source Synthesis Matrix/);
assert.match(enriched, /Example \(2026\)/);
assert.match(enriched, /not been independently verified/);
assert.match(enriched, /Main claim: Claim/);

console.log("analysis tests passed");
