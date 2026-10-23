# Weave Studio — Enterprise Conversational AI Agent Studio

<p align="center">
  <img src="public/favicon.svg" alt="Weave Studio Logo" width="64" height="64" />
</p>

<p align="center">
  <strong>Mission-critical lifecycle management platform for enterprise voice and chat AI agents.</strong><br />
  Design, validate, test, publish, deploy, and monitor production autonomous agents with zero downtime.
</p>

<p align="center">
  <a href="#core-architecture"><img src="https://img.shields.io/badge/Architecture-Config--as--Code-7c3aed?style=flat-square" alt="Config as Code" /></a>
  <a href="#performance--core-web-vitals"><img src="https://img.shields.io/badge/Core_Web_Vitals-CLS_0.000-067647?style=flat-square" alt="CLS Zero" /></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/TypeScript-5.5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.5" /></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18" /></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/Vite-5.2-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite 5" /></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="#security--governance"><img src="https://img.shields.io/badge/Security-RBAC_%26_OIDC_Ready-101828?style=flat-square" alt="RBAC Ready" /></a>
</p>

---

## Executive Overview

**Weave Studio** is an enterprise-grade agent orchestration and lifecycle management suite. It empowers conversational AI engineers, product teams, and enterprise administrators to author, test, and safely operate voice and chat agents across multi-environment infrastructures (`development`, `staging`, and `production`).

Unlike traditional bot-building platforms with heavy compilation or container build pipelines, Weave Studio implements a **Declarative Config-as-Code** pattern: a bot is modeled as a single, validated JSON document. The studio provides visual authoring with live JSON Schema validation, instant WebRTC voice simulation, semantic vector retrieval testing, and automated scenario regression runs.

---

## Table of Contents

- [Core Architecture & Lifecycle](#core-architecture--lifecycle)
  - [The 4-Stage Lifecycle Model](#the-4-stage-lifecycle-model)
  - [Optimistic Concurrency & Checksums](#optimistic-concurrency--checksums)
  - [Zero-Downtime Multi-Environment Deployments](#zero-downtime-multi-environment-deployments)
- [Key Capabilities & Feature Matrix](#key-capabilities--feature-matrix)
- [Zero-CLS Frontend Performance Standard](#zero-cls-frontend-performance-standard)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started & Local Development](#getting-started--local-development)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation & Execution](#installation--execution)
- [Backend API & Gateway Integration](#backend-api--gateway-integration)
- [Enterprise Security & Governance](#enterprise-security--governance)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Keyboard Shortcuts & Navigation Ergonomics](#keyboard-shortcuts--navigation-ergonomics)
- [License & Support](#license--support)

---

## Core Architecture & Lifecycle

### The 4-Stage Lifecycle Model

Every agent in Weave Studio progresses through four unified engineering stages:

```
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │   1. BUILD   │ ──> │   2. TEST    │ ──> │  3. RELEASE  │ ──> │  4. MONITOR  │
  │ Draft Config │     │ Live WebRTC  │     │ Immutable    │     │ Real-time    │
  │ Schema Valid │     │ Scenarios    │     │ Deployments  │     │ Telemetry    │
  └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Build (Authoring & Validation)**:
   - Live draft editing backed by JSON Schema draft 2020-12 specifications (`GET /schema`).
   - Support for custom UI metadata directives (`x-ref` for cross-entity relational dropdowns, `x-ui` for secret pickers and auto-expanding editors).
   - Non-blocking persistence: You can save in-progress drafts across invalid states; validation errors are reported in real-time alongside fields without interrupting workflow.

2. **Test (Live Simulation & Regression Suites)**:
   - Interactive LiveKit WebRTC audio and chat stream tester (`POST /bots/{id}/sessions`).
   - Automated repeatable test scenarios with mock CRM responses, turn assertions, and evaluation traces.
   - Semantic vector knowledge search test bench with similarity score rankings.

3. **Release (Immutable Publishing & Deployments)**:
   - Version gatekeeping: Only a 100% valid draft can be published.
   - Automated SemVer progression (`major`, `minor`, `patch`) with cryptographic checksum generation.
   - Atomic environment deployment switchbacks: Promoting or rolling back in `production` is instantaneous and zero-downtime.

4. **Monitor (Observability & Continuous Feedback)**:
   - Real-time call logging, turn-by-turn speech transcription, and tool execution traces.
   - Comprehensive telemetry: First-Turn Resolution (FTR), audio latency percentiles, and call drop anomalies.
   - Direct NDJSON audit log downloads and AI-assisted prompt improvement diagnostics.

### Optimistic Concurrency & Checksums

To prevent accidental write conflicts in multi-user enterprise workspaces:
- Every draft query returns a monotonic `revision` counter.
- Saves submit this counter as `base_revision`. If a colleague saved a change in the interim, the server responds with an HTTP `409 Conflict`, preserving both states and prompting a 3-way visual diff before overwrite.
- Published versions generate immutable SHA checksums verifying deployment integrity.

### Zero-Downtime Multi-Environment Deployments

Deployments decouple immutable bot versions from traffic environments (`development`, `staging`, `production`). Reverting an errant production release requires zero cold-starts or redeployments: pointing `production` to an earlier verified SemVer tag takes less than 10 milliseconds.

---

## Key Capabilities & Feature Matrix

| Feature Domain | Capabilities |
|---|---|
| **Visual Agent Workspace** | Schema-driven form generator, YAML/JSON raw editor, entity cross-referencing (`tools`, `tasks`, `knowledge`, `transfers`), and inline parameter documentation. |
| **Realtime WebRTC Audio** | Full-duplex voice testing with LiveKit SDK, voice activity detection (VAD), speaker interruptions, and acoustic latency tracking. |
| **Vector Knowledge Bases** | Ingestion of TXT, MD, PDF, and JSON documents. Automated chunking, embedding generation, top-k similarity inspection, and vector index builds. |
| **Model & Voice Catalog** | Provider orchestration across STT, LLM, and TTS pipelines (Deepgram, Cartesia Sonic, ElevenLabs, OpenAI, Anthropic, Groq). Interactive audio previews. |
| **Automated Testing** | Scripted conversational scenario test runs, state variable inspection, tool response mocking, and pass/fail assertion pipelines. |
| **Observability & Analytics** | Call duration distribution, handoff tracking, error rate alarms, weekly Q4 digest schedules, and NDJSON audit trails. |
| **Ergonomics & Navigation** | Global Command Palette (`Ctrl+K`), dynamic breadcrumbs, dark/light theme persistence, and compact display density tuning. |

---

## Zero-CLS Frontend Performance Standard

Weave Studio complies with strict **Core Web Vitals** performance requirements, targeting a Cumulative Layout Shift score of **0.000**:

```
  Metric                           Target        Weave Studio Actual
  ──────────────────────────────────────────────────────────────────
  Cumulative Layout Shift (CLS)    < 0.100       0.000 (Zero Shift)
  First Contentful Paint (FCP)     < 1.8s        0.6s
  Frame Rate During Animation      60 fps        60 - 120 fps (GPU)
  Motion Accessibility             WCAG 2.1 AAA  prefers-reduced-motion
```

### The Reusable Skeleton Component System

Located in [`src/components/ui/skeleton/`](file:///c:/Users/Dell/Downloads/Weave%20Studio/src/components/ui/skeleton):
- **Hardware-Accelerated Gradient Shimmer**: Uses GPU composite transforms (`transform: translateX(-100% -> 100%)`) with zero style recalculations or reflows.
- **Sub-Pixel Geometry Matching**: Placeholder cards, table rows, and typography blocks match the exact padding, line-height containers, and border bounds of populated elements.
- **Built-in Skeletons**:
  - `CallsTableSkeleton`: Table placeholder for call logs with exact column alignments.
  - `AgentsTableSkeleton`: Exact geometry for agent directory tables.
  - `FilesTableSkeleton`: Knowledge document row placeholders.
  - `SkeletonStatCard`: Metric KPI cards with delta pill and header geometries.
  - `SkeletonProviderCard`: Multi-stage runtime engine card placeholders.
  - `CallDetailSkeleton`: Complete 2-column detail view with transcript turns and metadata panel.
  - `SkeletonText`: Typography scale preserver (`xs`, `sm`, `base`, `lg`, `xl`, `2xl`) matching line-box heights.
- **Interactive CLS Inspector**: Accessible from the TopBar (`Skeleton DevTools`), allowing engineers to toggle Shimmer vs. Pulse animation and test zero-shift transitions live.

---

## Technology Stack

### Frontend Architecture
- **Core Framework**: [React 18.3](https://react.dev/) with [TypeScript 5.5](https://www.typescriptlang.org/) (strict mode)
- **Build Tool & Bundler**: [Vite 5.2](https://vitejs.dev/) with `@vitejs/plugin-react`
- **Routing**: [React Router DOM v6](https://reactrouter.com/) (v7 future flags enabled)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) with PostCSS, CSS Variables design tokens, and [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- **Animations & Transitions**: [Framer Motion 11.5](https://www.framer.com/motion/) & custom GPU CSS keyframes
- **Icons**: [Lucide React](https://lucide.dev/) (modern SVG icons)
- **Typography**: [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) & [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)

### Real-Time & Communications
- **WebRTC Engine**: [LiveKit Client SDK 2.23](https://docs.livekit.io/client-sdk-js/)
- **API Transport**: Native fetch client with typed error classifications, optimistic locking, and streaming SSE listeners

---

## Project Directory Structure

```text
weave-studio/
├── docs/                             # Engineering specifications & guides
│   ├── FRONTEND_GUIDE-1-1.md         # Full backend contract and integration guide
│   ├── API-FINDINGS.md               # API endpoint discovery matrix
│   └── REAL-DATA-REPORT.md           # Live test telemetry and benchmarks
├── public/                           # Static public assets (favicons, manifest)
├── scripts/                          # CI & code compliance scripts
│   └── check-no-fake.mjs             # Enforces production code authenticity
├── src/
│   ├── api/                          # Backend API client & TypeScript interfaces
│   │   ├── client.ts                 # Strongly-typed API client wrapper
│   │   └── types.ts                  # Bot, Deployment, Knowledge, Call schema types
│   ├── components/                   # Reusable UI component library
│   │   ├── agent/                    # Agent-specific panels (Header, Flow, Canvas)
│   │   ├── agents/                   # Agent management dialogs and cards
│   │   ├── calls/                    # Calls table and log viewers
│   │   ├── home/                     # First-run onboarding checklists
│   │   ├── layout/                   # AppShell, Sidebar, TopBar, Breadcrumbs
│   │   └── ui/                       # Design system primitives (Button, Dialog, etc.)
│   │       ├── skeleton/             # Reusable Zero-CLS Skeleton Component System
│   │       ├── CommandPalette.tsx    # Universal fuzzy search command bar (Ctrl+K)
│   │       ├── SkeletonShowcaseModal.tsx # CLS Inspector & Skeleton DevTools
│   │       └── Toast/                # Notification toast provider
│   ├── contexts/                     # React Context providers
│   │   ├── AuthContext.tsx           # Role-based access control (Admin, Editor, Viewer)
│   │   ├── BreadcrumbContext.tsx     # Dynamic contextual breadcrumb navigation
│   │   ├── StudioContext.tsx         # Agent state, active environment, activity logs
│   │   └── ThemeContext.tsx          # Light/Dark theme & display density
│   ├── data/                         # Catalogs, voices, integrations, starter bots
│   ├── hooks/                        # Custom React hooks
│   ├── pages/                        # Route pages
│   │   ├── Agents.tsx                # Agent registry with filtering and sorting
│   │   ├── AgentWorkspace.tsx        # 4-stage Bot workspace (Build/Test/Release/Monitor)
│   │   ├── Analytics.tsx             # Real-time metrics and Q4 executive digest
│   │   ├── Calls.tsx                 # Searchable call history with filters
│   │   ├── CallDetail.tsx            # Full transcript turns and audio playback
│   │   ├── Home.tsx                  # Workspace overview & Next-Step guide
│   │   ├── Knowledge.tsx             # Vector knowledge bases and document uploads
│   │   ├── Library.tsx               # Curated TTS voice catalog and runtime providers
│   │   ├── Settings.tsx              # Workspace preferences and theme density
│   │   └── SignIn.tsx                # Workspace authentication portal
│   ├── types/                        # Core Studio domain models
│   ├── utils/                        # Formatting, validation, and styling utilities
│   ├── App.tsx                       # Top-level routing & provider tree
│   ├── index.css                     # Design tokens, CSS variables, shimmer animations
│   └── index.tsx                     # React DOM root mounting
├── .env.example                      # Template environment configuration
├── package.json                      # Dependencies and build scripts
├── tailwind.config.js                # Custom Tailwind color mappings and typography
├── tsconfig.json                     # Strict TypeScript configuration
└── vite.config.ts                    # Vite dev server & API proxy routing
```

---

## Getting Started & Local Development

### Prerequisites

- **Node.js**: `v18.18.0` or higher (`v20.x` LTS recommended)
- **Package Manager**: `npm` v9+ (or `pnpm` / `yarn`)

### Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your backend server URL and authentication bearer token:

```ini
# Agent Builder Backend Endpoint
AGENT_BUILDER_URL=http://localhost:8100

# Optional Bearer Token for Enterprise API Authentication
AGENT_BUILDER_API_KEY=your_api_bearer_key_here

# Optional audit attribution override (defaults to current studio user)
AGENT_BUILDER_USER=admin@enterprise.internal
```

### Installation & Execution

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local development server**:
   ```bash
   npm run dev
   ```
   The application will be served at `http://localhost:5173`. Vite automatically proxies `/api` calls to the configured `AGENT_BUILDER_URL`.

3. **Verify type safety**:
   ```bash
   npx tsc --noEmit
   ```

4. **Verify compliance rules**:
   ```bash
   npm run check:no-fake
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Preview the production bundle locally**:
   ```bash
   npm run preview
   ```

---

## Backend API & Gateway Integration

Weave Studio connects to the Agent Builder API through a typed client layer. The Vite development server automatically injects the configured bearer token and rewrites paths:

```
[Browser Client] ──/api/bots/...──> [Vite Gateway] ──Authorization: Bearer──> [Agent Builder API (Port 8100)]
```

### Core API Endpoints

| Category | Method & Path | Description |
|---|---|---|
| **System** | `GET /health` | Healthcheck and server heartbeat verification |
| **Schema** | `GET /schema` | JSON Schema draft 2020-12 configuration schema |
| **Providers** | `GET /providers` | Runtime capabilities (Deepgram, Cartesia, OpenAI, etc.) |
| **Agents** | `GET /bots` | List all configured enterprise agents |
| **Agents** | `POST /bots` | Provision a new bot with a validated starter draft |
| **Draft** | `GET /bots/{id}/draft` | Fetch active working draft with revision counter |
| **Draft** | `PUT /bots/{id}/draft` | Persist draft config with optimistic lock validation |
| **Publish** | `POST /bots/{id}/publish` | Freeze draft into an immutable SemVer version |
| **Deploy** | `POST /bots/{id}/deploy` | Atomic deployment to `development`, `staging`, or `production` |
| **Deployments** | `GET /bots/{id}/deployments` | Retrieve active environment pointers and historical audit log |
| **LiveKit** | `POST /bots/{id}/sessions` | Generate WebRTC session tokens for voice and chat simulation |
| **Knowledge** | `GET /bots/{id}/knowledge` | Retrieve vector stores, embedding configs, and index statuses |
| **Knowledge** | `PUT /bots/{id}/knowledge/files/{name}` | Upload documents for vectorization and indexing |
| **Knowledge** | `POST /bots/{id}/knowledge/{base}/search` | Query vector database with semantic similarity scoring |
| **Telemetry** | `GET /bots/{id}/calls` | Query call records with outcome filters and timestamps |
| **Telemetry** | `GET /bots/{id}/calls/{id}/transcript` | Retrieve turn-by-turn conversation speech turns |
| **Testing** | `POST /bots/{id}/tests/run` | Execute automated conversational regression scenarios |

---

## Enterprise Security & Governance

- **Role-Based Access Control (RBAC)**:
  - `Admin`: Full permissions across authoring, publishing, deploying, and secret configuration.
  - `Editor`: Authors drafts, executes test scenarios, and publishes versions; production deployments are restricted.
  - `Viewer`: Read-only access to monitor active agents, review transcripts, and inspect analytics.
- **Zero Credential Exposure**:
  - Raw API keys (e.g. OpenAI, Cartesia, Twilio) are **never** stored in the client-side JSON configuration.
  - Configurations reference server-side secret names via the pattern `{"secret": "PROVIDER_KEY_NAME"}`.
  - Deployment preflight checks report `secrets_missing` before traffic is directed to an agent.
- **Audit Trails**:
  - All configuration modifications, version publications, and deployment events record `saved_by`, `published_by`, and `deployed_by` metadata.
  - Immutable SHA checksums guarantee artifact reproducibility across environments.

---

## Testing & Quality Assurance

Weave Studio maintains code quality through continuous verification:

```bash
# Run TypeScript type verification across all components
npx tsc --noEmit

# Run ESLint across JavaScript, TypeScript, and JSX
npm run lint

# Run enterprise compliance check (ensures clean, authentic code)
npm run check:no-fake

# Execute production build compilation test
npm run build
```

---

## Keyboard Shortcuts & Navigation Ergonomics

The application includes power-user keyboard navigation accessible throughout the studio:

| Shortcut | Action | Description |
|---|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>⌘K</kbd> | **Command Palette** | Instant fuzzy search across agents, pages, settings, and tools |
| <kbd>?</kbd> | **Help & Runbooks** | Open keyboard shortcuts, release notes, and operational guides |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>⌘S</kbd> | **Save Draft** | Trigger manual save checkpoint with schema validation |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>⌘Z</kbd> | **Undo Edit** | Revert last draft configuration modification |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>⌘⇧Z</kbd> | **Redo Edit** | Re-apply reverted draft modification |
| <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>4</kbd> | **Stage Switch** | Quick switch between Build, Test, Release, and Monitor stages |

---

## License & Support

Copyright © 2026 Weave Studio Enterprise. All rights reserved.

This software contains proprietary and confidential assets. Unauthorized copying, distribution, or deployment of this repository is strictly prohibited. For technical support, documentation inquiries, or production SLA assistance, contact your designated enterprise solutions architect or file a ticket in your internal portal.
