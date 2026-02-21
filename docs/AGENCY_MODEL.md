# MonokerOS - Agency Model

## Overview

MonokerOS is an AI-native software development agency that operates with minimal human oversight. AI agents organized into specialized teams handle all project work, with every task requiring cross-validation by at least 2 agents (the "sink-fan" pattern).

---

## Human Roles

| Role | Count | Responsibilities |
|------|-------|-----------------|
| IT Director | 1 | Infrastructure, security, agent provisioning, system health |
| Director of Sales | 1 | Client intake, proposal approval, contract management |
| PM Supervisors | 1-3 | Gate approvals, escalation handling, quality oversight |

Humans interact only with Team Leads - never directly with agents.

---

## AI Teams

The agency comprises **6 specialized teams**, each with 1 Lead and a minimum of 2 Agents:

### 1. Product Management
- **Lead**: Coordinates project lifecycle, manages requirements, tracks progress
- **Agents**: Requirements analyst, sprint planner, documentation specialist
- **Active Phases**: All phases (0-9)

### 2. UI/UX Design
- **Lead**: Design system governance, user research synthesis, design reviews
- **Agents**: Visual designer, interaction designer, accessibility specialist
- **Active Phases**: Discovery (1), Design (4), Testing (6)

### 3. Development
- **Lead**: Architecture decisions, code review, tech debt management
- **Agents**: Frontend engineer, backend engineer, full-stack engineer
- **Active Phases**: Kickoff (3), Development (5), Testing (6), Deployment (8)

### 4. Testing/QA
- **Lead**: Test strategy, quality gates, regression management
- **Agents**: Test automation engineer, manual QA analyst, performance tester
- **Active Phases**: Development (5), Testing (6), Deployment (8)

### 5. DevOps
- **Lead**: Pipeline management, infrastructure as code, monitoring
- **Agents**: CI/CD engineer, cloud infrastructure agent, monitoring agent
- **Active Phases**: Kickoff (3), Development (5), Deployment (8), Handoff (9)

### 6. SEO/SEA
- **Lead**: SEO strategy, content optimization, analytics
- **Agents**: Technical SEO specialist, content strategist, analytics agent
- **Active Phases**: Discovery (1), SEO & Optimization (7), Handoff (9)

---

## Cross-Validation Protocol (Sink-Fan Pattern)

Every task that produces a deliverable must be cross-validated:

```
                    ┌─── Agent A (independent work) ───┐
Task ─── Lead ──────┤                                   ├─── Lead (synthesis) ─── Result
  (fan out)         └─── Agent B (independent work) ───┘       (converge)
```

### Process
1. **Fan**: Lead receives task, fans out to 2+ agents working independently
2. **Work**: Agents produce results without seeing each other's work
3. **Converge**: Results flow back to Lead for synthesis
4. **Score**: Lead computes agreement score between agent outputs

### Agreement Scoring
| Score | Confidence | Action |
|-------|-----------|--------|
| > 90% | HIGH | Auto-approve, proceed |
| 70-90% | MEDIUM | Lead resolves differences, documents rationale |
| < 70% | LOW | Escalate to PM Supervisor for human review |

---

## Communication Hierarchy

```
Human <──────> Lead          (direct oversight)
Lead  <──────> Lead          (cross-team collaboration)
Lead  <──────> Agent         (within same team)
Agent <──────> Agent         (within same team, when permitted by Lead)
Agent <──X──> Agent          (NEVER across teams)
```

### Rules
- Agents **never** communicate directly across teams
- All cross-team communication flows through Leads
- Humans interact only with Leads
- Agents can communicate within their team when their Lead permits it

---

## Three Agency Views

### 1. Workforce View (Status-Focused)
Shows all agents with their current status (idle, working, reviewing, blocked, offline). Emphasizes real-time operational awareness.

### 2. Management View (Hierarchy-Focused)
Shows the reporting structure: Humans -> Leads -> Agents. Emphasizes supervision edges and organizational hierarchy.

### 3. Project View (Assignment-Focused)
Shows which agents/teams are assigned to which projects. Emphasizes project-colored assignment edges and workload distribution.
