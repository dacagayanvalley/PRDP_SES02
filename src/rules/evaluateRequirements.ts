import type { Requirement, ScreeningRecord } from "../domain/types";

export interface ScreeningQuestionSchema {
  id: string;
  text: string;
  yesAction?: string;
  noAction?: string;
  trigger?: string;
  triggerOn?: "yes" | "no";
}

export interface ScreeningFormSchema {
  id: string;
  annex: "B" | "C";
  title: string;
  version: string;
  basis: string;
  sections: { id: string; title: string; questions: ScreeningQuestionSchema[] }[];
}

const triggerLabels: Record<string, { label: string; dueStage: string; owner: string; blocking: boolean }> = {
  exclude: { label: "Eligibility exclusion / redesign required", dueStage: "NOL1", owner: "RPCO SES", blocking: true },
  "ip-plan": { label: "Integrate ADSDPP/IP community plan and IP safeguards review", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  consultation: { label: "Document stakeholder/public consultation", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "land-use": { label: "Confirm congruence with approved land use plan", dueStage: "NOL1", owner: "Proponent LGU", blocking: true },
  "ecc-esa-esmp": { label: "EIA/IEE/ESA, ECC and ESMP", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "cnc-esa-esmp": { label: "DENR coverage/CNC and ESA/ESMP", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "hazard-clearance": { label: "Hazard assessment/clearance and climate-resilient design measures", dueStage: "NOL1", owner: "Proponent/GGU/RPCO SES", blocking: true },
  "esmp-design": { label: "DED/POW/ESMP design mitigation", dueStage: "NOL1", owner: "Proponent/Engineer", blocking: true },
  "labor-ohs": { label: "LMP-aligned code of conduct, worker GRM and OSH plan", dueStage: "NOL2", owner: "Proponent/Contractor", blocking: true },
  "water-permit": { label: "NWRB water permit and water testing", dueStage: "NOL2", owner: "Proponent", blocking: true },
  "esmp-resource": { label: "Resource efficiency measures in ESMP", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  wastewater: { label: "Wastewater treatment and operations procedure", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "waste-disposal": { label: "Waste disposal site agreement/permit", dueStage: "NOL1", owner: "Proponent/Contractor", blocking: true },
  "pollution-control": { label: "Air/odor pollution-control measures", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "hazardous-waste": { label: "Hazardous waste handling under RA 6969", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "solid-waste": { label: "Composting or solid-waste disposal arrangement", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "ehs-officer": { label: "Designate or hire Environment, Health and Safety Officer", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "community-health": { label: "Community health and safety measures in ESMP", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "dam-esmf": { label: "Dam safety processing under ESMF", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "communicable-disease": { label: "Communicable disease prevention and LGU coordination", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "labor-influx": { label: "Labor influx/community safety measures", dueStage: "NOL1", owner: "Proponent/Contractor", blocking: true },
  "ecosystem-services": { label: "Ecosystem services assessment and ESMP mitigation", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "pap-survey": { label: "PAP/assets/access survey and consultation evidence", dueStage: "NOL1", owner: "Proponent LGU", blocking: true },
  rap: { label: "Resettlement Action Plan and livelihood restoration", dueStage: "NOL2", owner: "Proponent LGU", blocking: true },
  "land-acquisition": { label: "Land acquisition/ROW/easement documents", dueStage: "NOL1", owner: "Proponent LGU", blocking: true },
  "tenurial-instrument": { label: "DENR tenurial instrument", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "reclamation-permit": { label: "Philippine Reclamation Authority permit", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "biodiversity-esmp": { label: "Biodiversity/ecosystem service mitigation in ESA/ESMP", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "forest-tenure": { label: "SLUP/FLAG or forest/AD tenure clearance", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "tree-protection": { label: "Avoidance/protection plan for threatened or century-old trees", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "tree-cutting": { label: "DENR tree cutting permit and Tree Replacement Plan", dueStage: "NOL2", owner: "Proponent", blocking: true },
  "protected-area-esmp": { label: "Protected area/forest impact avoidance measures in ESMP", dueStage: "NOL1", owner: "Proponent", blocking: true },
  bmp: { label: "Biodiversity Management Plan", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "pamb-sapa": { label: "DENR/PAMB clearance and SAPA/related protected-area approval", dueStage: "NOL1", owner: "Proponent", blocking: true },
  "fpic-cp": { label: "FPIC process and NCIP Certificate of Precondition", dueStage: "NOL1", owner: "Proponent/NCIP", blocking: true },
  "ip-consultation": { label: "Meaningful IP consultation documentation", dueStage: "NOL1", owner: "Proponent/NCIP", blocking: true },
  chmp: { label: "Cultural Heritage Management Plan with Chance Find Procedure", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  "gbv-sea": { label: "GBV/SEA code of conduct and training", dueStage: "NOL2", owner: "Proponent/Contractor", blocking: true },
  "conflict-assessment": { label: "Conflict context assessment and mitigation", dueStage: "NOL1", owner: "Proponent/RPCO SES", blocking: true },
  redesign: { label: "Redesign/adjustment to avoid exacerbating conflict", dueStage: "NOL1", owner: "Proponent", blocking: true },
};

export function flattenQuestions(schemas: ScreeningFormSchema[]) {
  return schemas.flatMap((schema) => schema.sections.flatMap((section) => section.questions.map((question) => ({ schema, section, question }))));
}

export function generateRequirementsFromScreenings(subprojectId: string, screenings: ScreeningRecord[], schemas: ScreeningFormSchema[]): Requirement[] {
  const questionIndex = new Map(flattenQuestions(schemas).map((item) => [item.question.id, item]));
  const generated = new Map<string, Requirement>();

  for (const screening of screenings.filter((item) => item.subprojectId === subprojectId)) {
    for (const answer of screening.answers) {
      const item = questionIndex.get(answer.questionId);
      if (!item?.question.trigger) continue;
      const triggerOn = item.question.triggerOn ?? "yes";
      const isTriggered = triggerOn === "yes" ? answer.value === true : answer.value === false;
      if (!isTriggered) continue;

      const template = triggerLabels[item.question.trigger] ?? { label: item.question.trigger, dueStage: "NOL1", owner: "Proponent", blocking: true };
      const id = `gen-${subprojectId}-${answer.questionId}-${item.question.trigger}`;
      generated.set(id, {
        id,
        subprojectId,
        label: template.label,
        basis: `${item.schema.basis}; ${item.question.id}`,
        dueStage: template.dueStage,
        status: "Missing",
        blocking: template.blocking,
        owner: template.owner,
      });
    }
  }

  return [...generated.values()];
}
