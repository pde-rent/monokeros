# MonokerOS - SDLC Workflow

## Overview

Every project follows a 10-phase Software Development Lifecycle (SDLC) with 8 human gate checkpoints. Not all teams are active in every phase - teams are activated as needed.

---

## Project Phases

| # | Phase | Description | Active Teams | Human Gate |
|---|-------|-------------|-------------|------------|
| 0 | **Intake** | Client request received, initial triage | PM | Gate 0: Sales Director approves intake |
| 1 | **Discovery & Estimation** | Requirements gathering, effort estimation, feasibility analysis | PM, Design, SEO | Gate 1: PM Supervisor validates estimate |
| 2 | **PRD & Proposal** | Product Requirements Document, client proposal generation | PM | Gate 2: Sales Director approves proposal |
| 3 | **Kickoff** | Project setup, environment provisioning, team briefing | PM, Dev, DevOps | Gate 3: IT Director approves infrastructure |
| 4 | **Design** | UI/UX design, prototyping, design system integration | PM, Design | Gate 4: PM Supervisor approves designs |
| 5 | **Development** | Implementation, code review, unit testing | PM, Dev, QA, DevOps | - |
| 6 | **Testing** | Integration testing, QA validation, bug fixing | PM, Dev, QA | Gate 5: PM Supervisor approves for release |
| 7 | **SEO & Optimization** | SEO audit, performance optimization, content optimization | PM, SEO | Gate 6: PM Supervisor approves SEO |
| 8 | **Deployment** | Staging deploy, production deploy, smoke testing | PM, Dev, QA, DevOps | Gate 7: IT Director approves production deploy |
| 9 | **Handoff** | Documentation, client training, warranty period start | PM, SEO, DevOps | Gate 8: Sales Director confirms handoff |

---

## Human Gate Checkpoints

Gates are mandatory approval points where a human must review and approve before the project proceeds.

### Gate Details

| Gate | Phase Transition | Approver | Criteria |
|------|-----------------|----------|----------|
| Gate 0 | Intake -> Discovery | Sales Director | Valid client, feasible scope, budget alignment |
| Gate 1 | Discovery -> PRD | PM Supervisor | Estimate accuracy, risk assessment complete |
| Gate 2 | PRD -> Kickoff | Sales Director | Client accepts proposal, contract signed |
| Gate 3 | Kickoff -> Design | IT Director | Infrastructure provisioned, security review passed |
| Gate 4 | Design -> Development | PM Supervisor | Design approved by client, accessibility checked |
| Gate 5 | Testing -> SEO | PM Supervisor | All critical bugs resolved, coverage thresholds met |
| Gate 6 | SEO -> Deployment | PM Supervisor | SEO score targets met, performance benchmarks passed |
| Gate 7 | Deployment -> Handoff | IT Director | Production stable, monitoring configured, rollback tested |
| Gate 8 | Handoff -> Complete | Sales Director | Client accepts deliverables, documentation complete |

### Gate Statuses
- `PENDING` - Not yet reached
- `AWAITING_APPROVAL` - Ready for human review
- `APPROVED` - Human approved, proceed to next phase
- `REJECTED` - Human rejected, return to previous phase with feedback
- `BYPASSED` - Emergency override (requires IT Director + PM Supervisor)

---

## Phase-Based Team Activation

```
Phase    | PM | Design | Dev | QA | DevOps | SEO
---------|----+--------+-----+----+--------+----
Intake   | *  |        |     |    |        |
Discovery| *  |   *    |     |    |        |  *
PRD      | *  |        |     |    |        |
Kickoff  | *  |        |  *  |    |   *    |
Design   | *  |   *    |     |    |        |
Develop  | *  |        |  *  | *  |   *    |
Testing  | *  |        |  *  | *  |        |
SEO      | *  |        |     |    |        |  *
Deploy   | *  |        |  *  | *  |   *    |
Handoff  | *  |        |     |    |   *    |  *
```

---

## Minimum Staffing

Per project:
- **6 Leads** (one per team, shared across projects)
- **12 Agents** (minimum 2 per team)
- **Total**: 18 AI agents minimum per project

Agency-wide:
- Leads are shared resources across projects
- Agents may be shared but workload must not exceed 2 concurrent projects
- PM Lead is the primary project coordinator

---

## Task Flow Within a Phase

1. PM Lead creates phase tasks based on phase requirements
2. Tasks are assigned to appropriate team Leads
3. Each Lead fans out work to 2+ agents (cross-validation)
4. Agents work independently, produce deliverables
5. Lead synthesizes results, computes agreement score
6. If LOW confidence: escalate to PM Supervisor
7. If MEDIUM/HIGH: Lead marks task complete
8. When all phase tasks complete: gate check (if applicable)
9. Human approves gate -> proceed to next phase
