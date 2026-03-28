import { AiProvider, WorkspaceIndustry, TaskPriority } from "@monokeros/types";
import type { TemplateManifest } from "../types";
import {
  pmLead,
  pmAnalyst,
  qaLead,
  qaEngineer,
  devopsLead,
  devopsInfra,
  designLead,
  uxDesigner,
  mobileDesigner,
  accountingLead,
  accountingAnalyst,
  mobileLead,
  iosDev,
  androidDev,
  flutterDev,
  appStoreLead,
} from "./_shared/agents";
import {
  pmTeam,
  qaTeam,
  devopsTeam,
  accountingTeam,
  mobileDevTeam,
  asoTeam,
  mobileDesignTeam,
} from "./_shared/teams";

export const mobileDevAgencyTemplate: TemplateManifest = {
  id: "mobile-dev-agency",
  version: "1.0.0",
  displayName: "Mobile Development Agency",
  description:
    "Cross-platform mobile agency with PM, design, mobile dev, QA, DevOps, ASO, and accounting teams.",
  longDescription: `## Mobile Development Agency Template

A complete AI workforce for a mobile development agency. Seven teams delivering cross-platform mobile apps from concept to app store.

### Teams

- **Product Management** — Requirements gathering, PRDs, sprint planning, and delivery tracking
- **UI/UX Design** — Mobile UI patterns, platform-specific design, and UX research
- **Mobile Development** — Flutter cross-platform, native iOS (Swift), and native Android (Kotlin)
- **Quality Assurance** — Test strategy, device testing, and automated mobile tests
- **DevOps** — CI/CD for mobile builds, fastlane, and infrastructure
- **App Store Optimization** — ASO strategy, listing optimization, and launch campaigns
- **Accounting** — Budget tracking, financial reporting, and cost analysis

### Workflow Phases

1. **Intake** — Client onboarding and project scoping
2. **Discovery** — Platform analysis and requirements gathering
3. **PRD/Proposal** — Product requirements and technical proposal
4. **Kickoff** — Sprint planning and team alignment
5. **Design** — Mobile wireframes, prototypes, and design system
6. **Development** — Cross-platform and native development
7. **Testing** — Device testing, E2E, and regression suites
8. **Beta** — TestFlight/Play Console beta distribution
9. **Release** — App store submission and launch`,
  author: "MonokerOS",
  icon: "DeviceMobile",
  category: "software",
  tags: ["mobile", "ios", "android", "flutter", "cross-platform", "app-store"],
  pricing: "free",
  agentCount: 16,
  teamCount: 7,
  workspace: {
    apiVersion: "v1",
    kind: "Workspace",
    metadata: {
      name: "mobile-dev-agency",
      labels: { template: "mobile-dev-agency" },
      annotations: {},
    },
    spec: {
      displayName: "Mobile Development Agency",
      description: "Cross-platform mobile development agency workspace",
      industry: WorkspaceIndustry.SOFTWARE_DEVELOPMENT,
      industrySubtype: "mobile",
      branding: { logo: null, color: "#10b981" },
      encryption: { atRest: true, inTransit: true },
      storage: { maxDriveSizeMb: 500 },
      defaults: {
        phases: [
          "intake",
          "discovery",
          "prd-proposal",
          "kickoff",
          "design",
          "development",
          "testing",
          "beta",
          "release",
        ],
        taskTypes: [],
        taskPriority: TaskPriority.MEDIUM,
      },
      providers: [],
      defaultProvider: AiProvider.ZAI,
    },
  },
  agents: [
    pmLead(),
    pmAnalyst(),
    designLead(),
    uxDesigner(),
    mobileDesigner(),
    mobileLead(),
    iosDev(),
    androidDev(),
    flutterDev(),
    qaLead(),
    qaEngineer(),
    devopsLead(),
    devopsInfra(),
    appStoreLead(),
    accountingLead(),
    accountingAnalyst(),
  ],
  teams: [
    pmTeam(),
    mobileDesignTeam(),
    mobileDevTeam(),
    qaTeam(),
    devopsTeam(),
    asoTeam(),
    accountingTeam(),
  ],
};
