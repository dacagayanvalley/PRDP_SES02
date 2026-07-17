import type { AnnexDScore } from "../domain/types";

const zeroBlockers = new Set(["criterion-1", "criterion-4", "criterion-5", "criterion-6"]);

export function evaluateAnnexD(scores: AnnexDScore[]) {
  const total = scores.reduce((sum, item) => sum + Number(item.score || 0), 0);
  const zeroFailures = scores.filter((item) => zeroBlockers.has(item.criterionId) && Number(item.score || 0) === 0);
  const passed = total >= 30 && zeroFailures.length === 0;

  return {
    total,
    passed,
    explanation: passed
      ? "Passed Annex D: total score is at least 30 and criteria 1, 4, 5 and 6 are non-zero."
      : `Failed Annex D: ${total < 30 ? "total score is below 30. " : ""}${zeroFailures.length ? `Zero score on ${zeroFailures.map((item) => item.label).join(", ")}.` : ""}`.trim(),
    basis: "ESMF Annex D, pp. 27-32",
  };
}

