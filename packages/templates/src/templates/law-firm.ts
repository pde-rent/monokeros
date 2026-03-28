import { AiProvider, WorkspaceIndustry, TaskPriority } from "@monokeros/types";
import type { TemplateManifest } from "../types";
import {
  managingPartner,
  litigationLead,
  litigationAssociate,
  corporateLead,
  corporateAssociate,
  complianceOfficer,
  paralegal,
  legalResearcher,
  clientRelations,
} from "./_shared/agents";
import { litigationTeam, corporateTeam, complianceTeam, clientServicesTeam } from "./_shared/teams";

export const lawFirmTemplate: TemplateManifest = {
  id: "law-firm",
  version: "1.0.0",
  displayName: "Law Firm",
  description:
    "Full-service law firm with litigation, corporate, compliance, and client services teams.",
  longDescription: `## Law Firm Template

A complete AI workforce for a full-service law firm. Includes four practice areas staffed with specialized legal agents.

### Teams

- **Litigation** — Case strategy, motions, discovery, and trial preparation
- **Corporate** — M&A, contracts, due diligence, and corporate governance
- **Compliance & Research** — Regulatory compliance, case law research, and policy drafting
- **Client Services** — Client intake, CRM, and relationship management

### Workflow Phases

1. **Intake** — Client onboarding and matter opening
2. **Research** — Case law and statutory research
3. **Analysis** — Legal strategy formulation
4. **Drafting** — Document preparation (motions, contracts, memos)
5. **Review** — Cross-validation and partner review
6. **Filing** — Court filings and regulatory submissions
7. **Closing** — Matter resolution and archival`,
  author: "MonokerOS",
  icon: "Scales",
  category: "legal",
  tags: ["legal", "law", "litigation", "corporate", "compliance"],
  pricing: "free",
  agentCount: 9,
  teamCount: 4,
  workspace: {
    apiVersion: "v1",
    kind: "Workspace",
    metadata: { name: "law-firm", labels: { template: "law-firm" }, annotations: {} },
    spec: {
      displayName: "Law Firm",
      description: "Full-service law firm workspace",
      industry: WorkspaceIndustry.LEGAL,
      industrySubtype: null,
      branding: { logo: null, color: "#1e3a5f" },
      encryption: { atRest: true, inTransit: true },
      storage: { maxDriveSizeMb: 500 },
      defaults: {
        phases: ["intake", "research", "analysis", "drafting", "review", "filing", "closing"],
        taskTypes: [],
        taskPriority: TaskPriority.MEDIUM,
      },
      providers: [],
      defaultProvider: AiProvider.ZAI,
    },
  },
  agents: [
    managingPartner(),
    litigationLead(),
    litigationAssociate(),
    corporateLead(),
    corporateAssociate(),
    complianceOfficer(),
    paralegal(),
    legalResearcher(),
    clientRelations(),
  ],
  teams: [litigationTeam(), corporateTeam(), complianceTeam(), clientServicesTeam()],
};
