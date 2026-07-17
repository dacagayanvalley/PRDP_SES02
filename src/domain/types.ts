export type ComponentCode = "IPLAN" | "IBUILD" | "IREAP" | "ISUPPORT" | "CERC";
export type RiskLevel = "Low" | "Moderate" | "Substantial" | "High";
export type Stage =
  | "Draft"
  | "Submitted for Validation"
  | "Under Screening"
  | "Returned for Correction"
  | "Screened In"
  | "Ineligible"
  | "Instrument Preparation"
  | "Under RPCO Review"
  | "Awaiting Requirements"
  | "Ready for Clearance"
  | "NOL 1 Issued"
  | "Procurement Readiness"
  | "NOL 2 Issued"
  | "Under Implementation"
  | "Under Operation/O&M"
  | "Completed"
  | "Closed/Archived";

export interface Subproject {
  id: string;
  code: string;
  title: string;
  component: ComponentCode;
  type: string;
  proponent: string;
  province: string;
  municipality: string;
  barangay?: string;
  commodity?: string;
  estimatedCostPhp: number;
  stage: Stage;
  riskLevel: RiskLevel;
  responsibleSes: string;
  coordinates?: { lat: number; lng: number };
  sensitiveFlags: string[];
  updatedAt: string;
}

export interface ScreeningAnswer {
  questionId: string;
  value: string | number | boolean;
  evidence?: string;
}

export interface ScreeningRecord {
  id: string;
  subprojectId: string;
  annex: "B" | "C" | "D";
  version: string;
  status: "Draft" | "Submitted" | "Reviewed" | "Returned";
  answers: ScreeningAnswer[];
  reviewerNotes?: string;
  updatedAt: string;
}

export interface AnnexDScore {
  criterionId: string;
  label: string;
  maxScore: number;
  score: number;
  remarks?: string;
}

export interface Requirement {
  id: string;
  subprojectId: string;
  label: string;
  basis: string;
  dueStage: string;
  status: "Missing" | "In Progress" | "Submitted" | "Accepted" | "Expired" | "Not Applicable";
  blocking: boolean;
  owner: string;
  dueDate?: string;
  remarks?: string;
}

export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  reason?: string;
  timestamp: string;
}

export interface GrievanceCase {
  id: string;
  reference: string;
  subprojectId?: string;
  category: string;
  channel: string;
  status: "Received" | "Screened" | "Assigned" | "Under Resolution" | "Escalated" | "Closed" | "Restricted Referral";
  isAnonymous: boolean;
  isRestricted: boolean;
  receivedAt: string;
  nextDueAt: string;
}

export interface MonitoringFinding {
  id: string;
  subprojectId: string;
  checklist: string;
  finding: string;
  severity: "Low" | "Moderate" | "High" | "Critical";
  status: "Open" | "Action Assigned" | "Evidence Submitted" | "Verified Closed";
  dueDate: string;
  responsibleParty: string;
}

export interface DocumentRecord {
  id: string;
  subprojectId: string;
  requirementId?: string;
  title: string;
  documentType: string;
  version: string;
  confidentiality: "Public" | "Internal" | "Restricted" | "Confidential";
  status: "Draft" | "Submitted" | "Accepted" | "Superseded";
  remarks?: string;
  updatedAt: string;
}

export interface PermitRecord {
  id: string;
  subprojectId: string;
  requirementId?: string;
  permitType: string;
  issuingAgency: string;
  referenceNumber?: string;
  status: "Not Started" | "Applied" | "Issued" | "Expired" | "Not Applicable";
  applicationDate?: string;
  issueDate?: string;
  expiryDate?: string;
  conditions?: string;
  updatedAt: string;
}
export interface ReferenceLayer {
  id: string;
  name: string;
  category: "Protected Area" | "Hazard" | "Ancestral Domain" | "Forest/Public Land" | "Administrative";
  custodian: string;
  version: string;
  sourceDate: string;
  allowedUse: string;
  sensitivity: "Public" | "Synthetic Demo" | "Restricted";
  geometry: {
    type: "circle";
    center: { lat: number; lng: number };
    radiusKm: number;
  };
}

export interface SpatialOverlayResult {
  id: string;
  subprojectId: string;
  layerId: string;
  layerName: string;
  category: ReferenceLayer["category"];
  result: "Inside" | "Near" | "Outside";
  distanceKm: number;
  uncertainty: string;
  reviewerConfirmed: boolean;
  generatedRequirementId?: string;
  checkedAt: string;
}