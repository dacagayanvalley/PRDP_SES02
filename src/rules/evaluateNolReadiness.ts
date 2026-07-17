import type { Requirement } from "../domain/types";

export function evaluateNolReadiness(requirements: Requirement[], gate: "NOL1" | "NOL2") {
  const relevant = requirements.filter((item) => item.dueStage === gate || item.dueStage === "Both");
  const blockers = relevant.filter((item) => item.blocking && !["Accepted", "Not Applicable"].includes(item.status));

  return {
    gate,
    ready: blockers.length === 0,
    blockers,
    relevant,
    explanation: blockers.length === 0
      ? `${gate} appears ready for human SES confirmation.`
      : `${gate} is blocked by ${blockers.length} requirement(s): ${blockers.map((item) => item.label).join(", ")}.`,
  };
}
