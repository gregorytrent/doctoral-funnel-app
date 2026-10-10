import assert from "node:assert/strict";
import { analyzeProject, analyzeStage, buildBlueprint, starterExample } from "../src/analysis.js";

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

console.log("analysis tests passed");
