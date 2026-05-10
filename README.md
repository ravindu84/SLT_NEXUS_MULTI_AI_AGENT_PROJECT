# SLT NEXUS: Ultimate Multi-Agent AI Ecosystem

## Overview
SLT NEXUS is a state-of-the-art Multi-Agent Artificial Intelligence platform developed by **NEXGEN Creators**. Built specifically for Sri Lanka Telecom (SLT), this system serves as a bridge between customer-facing services (B2C) and internal enterprise operations (B2B), particularly optimizing workflows within the Network Operations Center (NOC) and Digital Support Unit (DSU).

## Dual Subscription Model
The platform is designed to cater to two distinct user bases through a flexible subscription architecture:
1. **B2C Zone (Customer Facing):** Designed for public users interacting via 3D VR Kiosks, standard SaaS web portals, and cross-platform **Mobile Applications (React Native)**.
2. **B2B Zone (Internal Enterprise):** Designed for SLT internal staff utilizing NOC Admin Dashboards and Custom WFM Report Applications.

## The Brain: LIYA Orchestrator & AI Logic
At the core of the SLT NEXUS ecosystem sits **LIYA**, the Master Orchestrator powered by **LangGraph Core** and **LangChain**. LIYA routes requests, manages memory, and delegates tasks to a highly specialized swarm of 8 distinct AI Agents.

* **Advanced RAG Pipeline:** The system utilizes robust document processing techniques including **Text Chunking** and **Vector Embeddings** to feed accurate data into the AI models.
* **Vector Storage:** Embedded chunks are stored and retrieved efficiently using Vector Databases for hyper-accurate, context-aware responses.

## The Multi-Agent Swarm (8 Specialized Agents)

### Group 1: Customer Customer Agents (B2C - Outward Facing)
1. **Spark (Sales):** Handles new package inquiries and customer onboarding.
2. **Pulse (Tech/NOC):** Troubleshoots internet issues and checks fiber faults.
3. **Insight (Data):** Processes data queries and package comparisons.
4. **Guardian (Security):** Scam detection and account security verification.
5. **Vault (Blockchain & Smart Contracts):** Executes automated Smart Contracts and manages secure, immutable digital agreements for SLT enterprise and customer operations.
   
### Group 2: Internal Operations Agents (B2B - Inward Facing)
6. **Dispatcher (Auto-Tickets):** Automates ticket routing from NOC to regional units.
7. **Analyzer (WFM/Reports):** Generates daily summaries and connects with Clarity/WFM DBs.
8. **Provisioner (New Connections):** Automates the backend provisioning processes for new SLT lines.

## Tech Stack & Infrastructure
* **Frontend (Zone A):** Hosted on **Vercel Edge Network**. Built with Next.js, React Native (Mobile App), and React Three Fiber for the 3D Avatar (LIYA) integration.
* **Backend (Zone B):** Hosted on **AWS Cloud Infrastructure** (EC2 / Lambda). Powered by Python for heavy LangChain/LangGraph orchestration.
* **MCP (Model Context Protocol) Integrations:** The AI Agents strictly use MCP to securely connect, authenticate, and fetch real-time data from internal systems (Mock iMaster NCE, Clarity/WFM DB, and Billing Systems) without exposing core credentials.
* **Database, Auth & Vector Storage:** **Supabase** is used for secure New User Registration (Auth) and acts as the primary Vector DB to store embedded data chunks for the RAG pipeline.

## Getting Started (Local Setup)

To clone and run the SLT NEXUS ecosystem locally on your machine, follow these steps. *(Note: Open separate terminal windows for the frontend, backend, and mobile setups).*

### 1. Clone the Repository
```bash
git clone [https://github.com/ravindu84/SLT_NEXUS_MULTI_AI_AGENT_PROJECT.git](https://github.com/ravindu84/SLT_NEXUS_MULTI_AI_AGENT_PROJECT.git)
cd SLT_NEXUS_MULTI_AI_AGENT_PROJECT
```

### 2. Frontend Setup (Web Dashboard & 3D Avatar)
```bash
cd frontend
npm install
npm run dev
```

### 3. Backend Setup (Python RAG & LangGraph Agents)
```bash
cd ../backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 4. Mobile App Setup (React Native)
```bash
cd ../mobile
npm install
npx expo start
```

## Team
Conceptualized and developed by **NEXGEN Creators** for the ultimate AI transformation at SLT.
