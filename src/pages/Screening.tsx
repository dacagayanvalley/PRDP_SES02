import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { AppDataset } from "../data/repositories";
import { appendAudit, loadJson } from "../data/repositories";
import type { AnnexDScore, ScreeningAnswer, ScreeningRecord } from "../domain/types";
import { evaluateAnnexD } from "../rules/evaluateAnnexDScore";
import { generateRequirementsFromScreenings, type ScreeningFormSchema } from "../rules/evaluateRequirements";

function normalizeSchema(schema: ScreeningFormSchema): ScreeningFormSchema {
  const rawSections = schema.sections as unknown;
  if (Array.isArray(rawSections)) return schema;
  const maybeQuestions = (rawSections as { questions?: unknown })?.questions;
  if (Array.isArray(maybeQuestions)) {
    return {
      ...schema,
      sections: [{ id: "ungrouped", title: "Screening Questions", questions: maybeQuestions as ScreeningFormSchema["sections"][number]["questions"] }],
    };
  }
  return { ...schema, sections: [] };
}

const labels: Record<string, { label: string; maxScore: number }> = {
  "criterion-1": { label: "Open membership/stockholder policy", maxScore: 10 },
  "criterion-2": { label: "Plan for expansion of membership", maxScore: 5 },
  "criterion-3": { label: "Farmers/fishers are members/stockholders", maxScore: 10 },
  "criterion-4": { label: "Regular officer turnover/election", maxScore: 5 },
  "criterion-5": { label: "Business plan shows income increase", maxScore: 10 },
  "criterion-6": { label: "Tangible worker benefits", maxScore: 5 },
  "criterion-7": { label: "Security of tenure", maxScore: 5 },
  "criterion-8": { label: "No economic displacement", maxScore: 5 },
};

interface Props {
  dataset: AppDataset;
  actions: { save: (dataset: AppDataset, message?: string) => void };
}

export function Screening({ dataset, actions }: Props) {
  const [schemas, setSchemas] = useState<ScreeningFormSchema[]>([]);
  const [subprojectId, setSubprojectId] = useState(dataset.subprojects[0]?.id ?? "");
  const [annex, setAnnex] = useState<"B" | "C" | "D">("C");
  const [draftAnswers, setDraftAnswers] = useState<Record<string, ScreeningAnswer>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    Promise.all([
      loadJson<ScreeningFormSchema>("./data/forms/annex-b.json"),
      loadJson<ScreeningFormSchema>("./data/forms/annex-c.json"),
    ]).then((loaded) => setSchemas(loaded.map(normalizeSchema))).catch(console.error);
  }, []);

  const schema = schemas.find((item) => item.annex === annex);
  const existing = dataset.screenings.find((item) => item.subprojectId === subprojectId && item.annex === annex);

  useEffect(() => {
    const next = Object.fromEntries((existing?.answers ?? []).map((answer) => [answer.questionId, answer]));
    setDraftAnswers(next);
    setValidationMessage("");
  }, [existing?.id, subprojectId, annex]);

  const annexD = dataset.screenings.find((item) => item.annex === "D");
  const scores: AnnexDScore[] = annexD?.answers.map((answer) => ({
    criterionId: answer.questionId,
    label: labels[answer.questionId]?.label ?? answer.questionId,
    maxScore: labels[answer.questionId]?.maxScore ?? 0,
    score: Number(answer.value),
  })) ?? [];
  const result = evaluateAnnexD(scores);

  const progress = useMemo(() => {
    const total = schema?.sections.reduce((sum, section) => sum + section.questions.length, 0) ?? 0;
    const answered = schema?.sections.reduce((sum, section) => sum + section.questions.filter((question) => typeof draftAnswers[question.id]?.value === "boolean").length, 0) ?? 0;
    return { total, answered, percent: total ? Math.round((answered / total) * 100) : 0 };
  }, [draftAnswers, schema]);

  const triggeredPreview = useMemo(() => {
    if (!schema) return [];
    const screening: ScreeningRecord = {
      id: existing?.id ?? "preview",
      subprojectId,
      annex,
      version: schema.version,
      status: "Draft",
      answers: Object.values(draftAnswers),
      updatedAt: new Date().toISOString(),
    };
    return generateRequirementsFromScreenings(subprojectId, [screening], schemas);
  }, [annex, draftAnswers, existing?.id, schema, schemas, subprojectId]);

  function setAnswer(questionId: string, value: boolean | undefined) {
    setDraftAnswers((current) => {
      const previous = current[questionId] ?? { questionId, value: "" };
      if (value === undefined) {
        const next = { ...current };
        delete next[questionId];
        return next;
      }
      return { ...current, [questionId]: { ...previous, questionId, value } };
    });
  }

  function setRemarks(questionId: string, evidence: string) {
    setDraftAnswers((current) => {
      const previous = current[questionId] ?? { questionId, value: "" };
      return { ...current, [questionId]: { ...previous, evidence } };
    });
  }

  function saveScreening() {
    if (!schema) return;
    const missingEvidence = schema.sections.flatMap((section) => section.questions).filter((question) => {
      const answer = draftAnswers[question.id];
      const triggerOn = question.triggerOn ?? "yes";
      const triggered = triggerOn === "yes" ? answer?.value === true : answer?.value === false;
      return triggered && question.trigger && !(answer?.evidence ?? "").trim();
    });
    if (missingEvidence.length) {
      setValidationMessage(`Add remarks/evidence for ${missingEvidence.length} triggered requirement question(s): ${missingEvidence.map((question) => question.id).join(", ")}`);
      return;
    }
    setValidationMessage("");

    const record: ScreeningRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      subprojectId,
      annex,
      version: schema.version,
      status: "Draft",
      answers: Object.values(draftAnswers).filter((answer) => typeof answer.value === "boolean"),
      reviewerNotes: "Static MVP schema-driven screening draft.",
      updatedAt: new Date().toISOString(),
    };
    const otherScreenings = dataset.screenings.filter((item) => !(item.subprojectId === subprojectId && item.annex === annex));
    const nextScreenings = [record, ...otherScreenings];
    const otherRequirements = dataset.requirements.filter((item) => item.subprojectId !== subprojectId || !item.id.startsWith("gen-"));
    const generated = generateRequirementsFromScreenings(subprojectId, nextScreenings, schemas);
    const next = appendAudit(
      { ...dataset, screenings: nextScreenings, requirements: [...generated, ...otherRequirements] },
      { entityType: "Screening", entityId: record.id, action: `Saved Annex ${annex} screening and regenerated requirements`, actor: "Static MVP user" },
    );
    actions.save(next, `Saved Annex ${annex} and regenerated ${generated.length} requirement(s)`);
  }

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading">
          <div>
            <h2>Schema-Driven Annex Screening</h2>
            <p className="source">Annex B/C schemas are digitized from ESMF Annex pp. 9-26. Answers generate advisory requirements for the matrix.</p>
          </div>
          <button onClick={saveScreening} disabled={!schema}>Save and regenerate requirements</button>
        </div>
        <div className="form-toolbar">
          <label>Subproject
            <select value={subprojectId} onChange={(event) => setSubprojectId(event.target.value)}>
              {dataset.subprojects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
          </label>
          <label>Form
            <select value={annex} onChange={(event) => setAnnex(event.target.value as "B" | "C" | "D")}>
              <option value="B">Annex B - I-PLAN Early Screening</option>
              <option value="C">Annex C - I-BUILD/I-REAP Screening</option>
              <option value="D">Annex D - I-REAP Scoring Summary</option>
            </select>
          </label>
        </div>
        <div className="progress-row">
          <span>Progress: {progress.answered}/{progress.total} answered</span>
          <div className="progress-bar"><span style={{ width: `${progress.percent}%` }} /></div>
        </div>
        {validationMessage && <div className="inline-alert">{validationMessage}</div>}
        {annex === "D" ? <AnnexDSummary scores={scores} result={result} /> : schema ? (
          <ScreeningForm schema={schema} answers={draftAnswers} openSections={openSections} setOpenSections={setOpenSections} onAnswer={setAnswer} onRemarks={setRemarks} />
        ) : <p>Loading form schema...</p>}
      </section>
      <section className="panel">
        <h2>Triggered Requirement Preview</h2>
        {triggeredPreview.length === 0 ? <p>No triggered requirements yet.</p> : triggeredPreview.map((item) => (
          <div className="compact-card" key={item.id}>
            <strong>{item.label}</strong>
            <span>{item.dueStage} | {item.owner}</span>
            <small>{item.basis}</small>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Annex D Social Inclusiveness</h2>
        <span className={result.passed ? "status good" : "status bad"}>{result.passed ? "Passed" : "Needs action"}</span>
        <p>{result.explanation}</p>
        <p className="source">Basis: {result.basis}</p>
      </section>
    </div>
  );
}

function ScreeningForm({ schema, answers, openSections, setOpenSections, onAnswer, onRemarks }: {
  schema: ScreeningFormSchema;
  answers: Record<string, ScreeningAnswer>;
  openSections: Record<string, boolean>;
  setOpenSections: Dispatch<SetStateAction<Record<string, boolean>>>;
  onAnswer: (questionId: string, value: boolean | undefined) => void;
  onRemarks: (questionId: string, evidence: string) => void;
}) {
  return (
    <div className="schema-form">
      <h3>{schema.title}</h3>
      <p className="source">Version: {schema.version} | Basis: {schema.basis}</p>
      {schema.sections.map((section, index) => {
        const isOpen = openSections[section.id] ?? index === 0;
        const answered = section.questions.filter((question) => typeof answers[question.id]?.value === "boolean").length;
        return (
          <section className="form-section" key={section.id}>
            <button
              type="button"
              className="section-toggle"
              onClick={() => setOpenSections((current) => ({ ...current, [section.id]: !isOpen }))}
              aria-expanded={isOpen}
            >
              <span>{section.title}</span>
              <small>{answered}/{section.questions.length} answered</small>
            </button>
            {isOpen && section.questions.map((question) => {
              const answer = answers[question.id];
              return (
                <div className="question-card" key={question.id}>
                  <div>
                    <strong>{question.id}</strong>
                    <p>{question.text}</p>
                    {(question.yesAction || question.noAction) && <small>{question.yesAction ?? question.noAction}</small>}
                  </div>
                  <div className="answer-controls" role="group" aria-label={`${question.id} answer`}>
                    <label><input type="radio" name={question.id} checked={answer?.value === true} onChange={() => onAnswer(question.id, true)} /> Yes</label>
                    <label><input type="radio" name={question.id} checked={answer?.value === false} onChange={() => onAnswer(question.id, false)} /> No</label>
                    <button type="button" className="ghost small" onClick={() => onAnswer(question.id, undefined)}>Clear</button>
                  </div>
                  <textarea placeholder="Remarks / evidence reference" value={answer?.evidence ?? ""} onChange={(event) => onRemarks(question.id, event.target.value)} />
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function AnnexDSummary({ scores, result }: { scores: AnnexDScore[]; result: ReturnType<typeof evaluateAnnexD> }) {
  return (
    <div>
      <p>{result.explanation}</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Criterion</th><th>Score</th><th>Maximum</th></tr></thead>
          <tbody>{scores.map((item) => <tr key={item.criterionId}><td>{item.label}</td><td>{item.score}</td><td>{item.maxScore}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
