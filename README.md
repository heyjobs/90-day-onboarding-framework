# ACM 90-Day Onboarding Framework

A Salesforce-native guided onboarding system that structures the first 90 days of customer onboarding into five phases with SLA-tracked touchpoints, governance gates, and real-time alerting.

## Concept

Account Managers (ACMs) follow a structured 90-day journey from contract signature to independent customer relationship. The framework provides:

- **Guided touchpoint masks** — each call has a structured agenda with inline data capture
- **SLA tracking** — configurable per-touchpoint windows with On-Time / Late / Critical states
- **Governance gates** — Gate 1, Activation, O-Min, F2F, TL Gate, Close-Off — auto-validated from underlying data
- **Now & Next alerting** — real-time action items surfaced by phase and severity
- **Success Plan** — single source of truth for strategic context (customer goals, health, next-step signals)

### The Five Phases

| Phase | Days | Focus |
|-------|------|-------|
| Pre-Phase | Before Day 0 | AE handover review, internal setup, first customer contact |
| Phase 1 — Activation | 0–7 | Kickoff call, product activation confirmed |
| Phase 2 — Early Value | 8–30 | O-Min validation, optimization, stakeholder outreach |
| Phase 3 — Adoption | 31–74 | Strategic F2F, KPI establishment, performance tracking |
| Phase 4 — Review | 75–90 | Self-check, TL gate, 90-day review, handoff to BAU |

## Architecture

### Data Model

| Object | Purpose |
|--------|---------|
| `Onboarding__c` | Operational tracking — touchpoint dates, gates, SLA scores, phase |
| `Success_Plan__c` | Strategic context — goals, health, performance, next-step signals |
| `Onboarding_SLA_Rule__mdt` | Admin-configurable SLA windows per touchpoint (11 rules) |
| `Activity` (Event) | Additional touchpoints (ad-hoc calls, escalations) |

### Apex Services

| Class | Purpose |
|-------|---------|
| `OnboardingController` | CRUD for Onboarding + Success Plan, queries for Task/Customer_360/Case |
| `OnboardingSlaService` | Reads SLA rules from custom metadata, evaluates per-touchpoint + aggregate SLA |
| `OnboardingAlertService` | 20+ alerting rules across 5 phases, severity-sorted |
| `OnboardingControllerTest` | Test coverage for controller and services |

### LWC Components

| Component | Role |
|-----------|------|
| `onboardingTabContainer` | Entry point — visibility polling, LMS publishing |
| `onboardingOverview` | Main content — progress summary, expandable touchpoint timeline, guided masks |
| `onboardingMissionBanner` | Phase-aware colored card (ACM Mission + Customer State) |
| `onboardingSidebarStatus` | Health, SLA score, O-Min, next due, F2F, close-off |
| `onboardingSidebarTimeline` | Day counter, progress bar, phase indicator |
| `onboardingSidebarSuccessPlan` | Live-editable success plan fields with auto-save |
| `onboardingSidebarMustClose` | 6 governance gates with progress bar, click-to-navigate |
| `onboardingSidebarOpenItems` | Now & Next alert cards from AlertService |
| `onboardingSidebarMission` | Phase-aware mission text from custom labels |
| `onboardingSidebarResources` | Reference links and Day 0 logic |

Components communicate via Lightning Message Service (`OnboardingTabVisibility__c`).

### Design Principles

- **Minimal Viable Input** — only fields with a downstream consumer
- **Guided Mask = Documentation** — no separate post-call documentation step
- **Single Source of Truth** — Success Plan = Business Package (no separate object)
- **Automate First** — manual input only where human context is required
- **Fallback-Ready** — every auto-captured field has a manual path

## Project Structure

```
force-app/main/default/
  classes/              Apex controllers, services, tests
  lwc/                  12 Lightning Web Components
  objects/              Onboarding__c, Success_Plan__c, Onboarding_SLA_Rule__mdt, Activity
  customMetadata/       11 SLA rule records
  messageChannels/      OnboardingTabVisibility LMS channel
  labels/               18 custom labels (phase missions, UI text)
  permissionsets/       Onboarding_Full_Access
  layouts/              Record page layouts
  profiles/             Profile metadata
  flows/                Automation flows
  email/                Email templates
docs/                   Project documentation
data/                   Test data CSVs and field audit
scripts/                Data loading scripts
```

## Development Setup

### Prerequisites
- Salesforce CLI (`sf`)
- A Salesforce sandbox org

### Deploy to a sandbox
```bash
# Authenticate
sf org login web --alias my-sandbox --instance-url https://test.salesforce.com

# Deploy all metadata
sf project deploy start --source-dir force-app --target-org my-sandbox

# Assign permission set
sf org assign permset --name Onboarding_Full_Access --target-org my-sandbox
```

### Run tests
```bash
sf apex run test --class-names OnboardingControllerTest --target-org my-sandbox --wait 10
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Project scaffolding and documentation |
| `project/90day-onboarding` | All framework components |
| `feature/RO-*` | Per-ticket feature branches |

## Current Status

- Data model and Apex services deployed
- Overview-only UI with expandable touchpoint timeline
- IHC #1 expanded view with Pilot Handover Documentation Review and Customer Context sub-sections
- ATS Onboarding timeline element (from Case data)
- SLA tracking (per-touchpoint + aggregate score)
- Must-Close Items sidebar with click-to-navigate
- Progress Summary card (SLA adherence, touchpoints done, current phase)
- Add Touchpoint modal (creates SF Events)
- Sidebar components: Status, Timeline, Mission, Success Plan, Open Items, Must Close, Resources

## Spec Reference

Based on *ACM 90-Day Onboarding — Salesforce Data Architecture & Automation Spec v2.0* (March 2026, DRAFT).
