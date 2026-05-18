# SLT NEXUS: Solution Overview & Architecture Report

**Unified Omnichannel Swarm Intelligence Ecosystem for B2C & B2B Telecommunication Services**

*Prepared for SLT-MOBITEL Digital Innovation Competition*

---

## 1. Executive Vision

**SLT NEXUS** is an next-generation omnichannel AI ecosystem that unifies customer experience (B2C) and field service operations (B2B) under a single swarm intelligence framework.

### Key Strategic Pillars:
1.  **Immersive Web Kiosk Mode:** Bringing ultimate accessibility to SLT branch offices via a real-time **3D AI Avatar (LIYA)** with viseme lip-sync and **MediaPipe Gesture Recognition** for deaf/mute customers.
2.  **B2C Self-Fix Mobile App:** Empowers customers to run automated router tests, troubleshoot line errors, and pay bills independently.
3.  **B2B Technician Mobile App:** Connects field engineers to live database-level NMS diagnostics (TID, SNR, Optical Power, Attenuation) directly from the site.
4.  **12-Agent Swarm Orchestrator:** Engineered with LangGraph and Google Gemini Pro to dynamically route queries, check CRM records, and perform secure actions.

---

## 2. Cloud Architecture & Deployment Model

SLT NEXUS is engineered for global scale, speed, and strict security isolation, splitting operations into three optimal hosting zones:

```
[ Next.js Web App / Kiosk ] (Vercel Global CDN)
          │
          ▼  (HTTPS / WebSockets API calls)
[ FastAPI Agent Swarm Server ] (Render.com / AWS EC2)
    │           │           │
    ▼           ▼           ▼
[Supabase Auth] [pgvector RAG] [Supabase PostgreSQL DB] (Supabase Cloud Project)
```

### A. Vercel Cloud Platform (Frontend)
*   **Role:** Hosts the **Next.js Web Kiosk** and frontend client modules.
*   **Advantage:** Serves pages globally via edge caching, guaranteeing **sub-10ms loading speeds** for an ultra-smooth kiosk experience.

### B. Render / AWS EC2 (Backend Swarm Server)
*   **Role:** Hosts the **FastAPI Python server** running the **LangGraph state machine**.
*   **Advantage:** Bypasses serverless timeout limitations (e.g., Vercel's 10s execution cap) to run complex, long-running agent reasoning, RAG database calls, and ElevenLabs audio proxies.

### C. Supabase Cloud (Data & Security)
*   **Role:** Handles User Authentication, pgvector index search, and relational PostgreSQL telemetry.
*   **Advantage:** **Row Level Security (RLS)** restricts data access directly at the database level. B2C customers are strictly restricted to their own profiles, while B2B staff can select across the relational telemetry pool.

---

## 3. The 12-Agent Swarm: Deep Dive

At the heart of the system is a 12-Agent Swarm orchestrated via LangGraph. Each agent acts as an autonomous expert:

| Agent Name | Emoji | Target Domain | Core Responsibility & Tool Usage |
| :--- | :---: | :--- | :--- |
| **Manager** | 🤖 | Swarm Brain | Evaluates incoming prompts and dynamically routes execution to the correct sub-agent. |
| **Pulse** | 💓 | B2C Diagnostic | Executes automated router checks (Status, physical connection diagnostics). |
| **Oracle** | 🔮 | B2B Diagnostics | Fetches deep SQL telemetry parameters (SNR, Attenuation, Optical Power, TID) for field technicians. |
| **Analyzer** | 📊 | Staff Ops | Compiles technician shift logs and schedules automated email reports to regional managers. |
| **Signa** | 💗 | Accessibility | Manages Web Kiosk gesture recognition and translates signs to functional queries. |
| **Guardian** | 🛡️ | Security | Scans conversations in real-time to detect active phishing or telecommunications fraud. |
| **Vault** | 🔗 | Ledger Audit | Records customer resolutions to a local simulated blockchain ledger for verified SLA compliance. |
| **Provisioner**| 🔌 | Queue Routing | Dispatches priority service tasks and allocates staff resources based on current workloads. |
| **Pathfinder** | 📍 | Regional Ops | Analyzes signal coverage coordinates to optimize technician dispatch paths. |
| **Spark** | ⚡ | Up-selling | Recommends relevant data package upgrades based on active customer usage logs. |
| **Insight** | 👁️ | Billing | Resolves billing inquiries and parses complex billing reports via pgvector RAG. |
| **Messenger** | ✉️ | Dispatch | Sends real-time SMS, email, and WhatsApp notifications to clients and field staff. |

---

## 4. Relational Database & Security Design

To support our prototype, we engineered a relational SQLite database (`slt_dummy.db`) containing **200 dummy telephone numbers** (100 Fiber, 100 Copper), perfectly mimicking a live telecom CRM and Network Management System (NMS):

```
┌──────────────────┐          ┌───────────────────┐          ┌──────────────────┐
│   CRM_PROFILES   │          │  NETWORK_STATUS   │          │  BILLING_RECORD  │
├──────────────────┤          ├───────────────────┤          ├──────────────────┤
│ Phone (PK)       │◄─────────│ Phone (FK)        │◄─────────│ Phone (FK)       │
│ Customer Name    │          │ Optical Power     │          │ Outstanding Due  │
│ Address          │          │ SNR, Attenuation  │          │ Payment Status   │
│ Service Type     │          │ ONT Type, TID     │          │ Bill Cycle Date  │
└──────────────────┘          └───────────────────┘          └──────────────────┘
```

When the **Oracle B2B Agent** is queried by a technician, it triggers the `get_technician_diagnostics` tool which performs a three-way relational join to display:
*   *Customer Information (Name, Address, Service)*
*   *Live Telemetry (Optical Power: -26.4 dBm, SNR: 28.2 dB, Attenuation: 12.4 dB, TID: 5543)*
*   *Billing Status (Outstanding dues, status)*

---

## 5. Live User Journey Flowcharts

### B2C Customer Self-Fix Loop
```
[User Text/Voice Input] ──> [Manager Agent] ──> [Pulse Agent] ──> [Router Health Check Tool] ──> [Self-Fix Recommendation]
```

### B2B Technician Diagnostics Loop
```
[Technician Request] ──> [Manager Agent] ──> [Oracle Agent] ──> [SQLite JOIN Tool] ──> [Full Diagnostics Sheet Response]
```

---

## 📥 How to Export this Report as a Premium PDF

You can convert this markdown file into a beautifully formatted PDF report in seconds:

### Method 1: VS Code (One-Click)
1.  Install the **Markdown PDF** extension in VS Code.
2.  Right-click anywhere inside this `SLT_NEXUS_SOLUTION_OVERVIEW_REPORT.md` file.
3.  Select **Markdown PDF: Export (pdf)**.
4.  A beautifully styled vector PDF containing all text, tables, and the flowcharts will be generated in the same directory!

### Method 2: Online Converter
1.  Go to an online converter like [Dillinger.io](https://dillinger.io/) or [Markdown to PDF](https://dillinger.io).
2.  Drag and drop this file.
3.  Click **Export as PDF**.
