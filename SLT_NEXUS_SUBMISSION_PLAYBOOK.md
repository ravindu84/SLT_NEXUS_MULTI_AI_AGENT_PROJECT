# SLT NEXUS: Hackathon Submission Playbook

> **Omnichannel Telecom Support Redefined through 3D AI Avatars & Multi-Agent Swarms**
> Created for SLT-MOBITEL Digital Innovation Competition

---

## 1. Executive Summary & Pitch

### 💡 Project Tagline
*Empowering Omnichannel Telecom Support through Multi-Agent Swarms & 3D AI Accessibility.*

### 🚨 The Problem
1.  **Support Bottlenecks:** Customer hotlines face high wait times, and physical kiosk counters are frequently overloaded with repetitive inquiries.
2.  **Lacking Accessibility:** Over 400,000 deaf, mute, and visually impaired individuals in Sri Lanka have no seamless, independent way to interact with telecom service kiosks.
3.  **B2B Operations Gap:** Field technicians lack a unified, instant way to pull deep network diagnostic parameters (TID, SNR, Optical Power levels) on-site, leading to delayed repair resolutions.

### 🌟 The Solution: SLT NEXUS
SLT NEXUS is Sri Lanka’s first unified, multi-agent AI ecosystem designed for both B2C customers and B2B staff:
*   **Web Kiosk Mode:** Exposes a stunning 3D AI Avatar named **LIYA** who speaks Sinhala/Tamil/English naturally, accompanied by an interactive **MediaPipe Gesture Kiosk** for deaf/mute customers.
*   **B2C Customer Mobile App:** Allows instant self-diagnostic testing, bill payments, and smart troubleshooting.
*   **B2B Technician Mobile App:** Empowering ground staff with real-time network telemetry, instant diagnostics sheets, and priority ticket dispatches.
*   **The Intelligence Swarm:** 12 specialized sub-agents working together in a LangGraph state machine, communicating with CRM databases and RAG vector stores.

---

## 2. Key Features Implemented (The "Done" Checklist)

We have built a fully functional end-to-end prototype containing the following high-impact features:

### 🧠 A. The LangGraph Multi-Agent Swarm (12 Core Agents)
Instead of a single chatbot, a swarm of 12 specialized AI agents collaborate using persistent session memory:
*   **Manager Agent (The Brain):** Instantly classifies user intent (Voice, Text, Gesture) and routes it to the designated expert.
*   **Pulse Agent (B2C Diagnostics):** Runs automated router health checks (Fiber/Copper status).
*   **Oracle Agent (B2B Telemetry):** Performs deep SQL telemetry lookups (Optical Power, SNR, Attenuation, TID, ONT Type) for technicians.
*   **Analyzer Agent (Workforce Management):** Compiles shift logs and schedules automated email reports to ops leads.
*   **Signa Agent (Sign Language Router):** Translates physical hand gestures into functional API actions.
*   **Guardian Agent (Anti-Scam):** Scans client messages for active phishing or telecommunications fraud.
*   **Vault Agent (SLA Auditor):** Records customer resolutions to a local simulated blockchain ledger for verified SLA compliance.
*   **Insight, Spark, Provisioner, Pathfinder, and Messenger Agents:** Completing the B2B and B2C queue flows.

### 🎙️ B. LIYA: 3D AI Avatar & Real-time Speech Sync
*   **Viseme Lip-Sync Engine:** Translates ElevenLabs text-to-speech audio streams into real-time visual mouth movements (visemes) on a 3D bust model.
*   **Robust Fallback System:** Uses dynamic vertex displacement, head scale pulsation, and jaw bone rotations to guarantee visual response even during network lag.
*   **Studio-Grade Aesthetics:** Embedded in a WebGL canvas with customizable studio lighting, premium skin rendering, and an animated digital neural network background.

### 🤟 C. Deaf & Mute Accessibility Kiosk Simulator
*   **Webcam Hand Gesture Overlay:** Activates the client webcam and renders a glowing, floating, 4-joint neon skeletal hand mesh in real-time.
*   **Simulated Gesture Telemetry:** Built-in gesture triggers (`👋 Hello`, `🔧 Fault Sign`, `🛡️ Scam Sign`) that simulate MediaPipe hand tracking triggers, letting judges see exactly how deaf/mute customers communicate without needing hardware calibration during the live pitch.

### 📊 D. Relational Telemetry Database (slt_dummy.db)
*   **Synchronized CRM & NMS:** A fully relational SQLite database containing CRM profiles, active line states (FTTH / Copper), and real-time physical telemetry for **200 dummy numbers** (100 Fiber, 100 Copper).
*   **Technician Diagnostic Tool:** Seamless tool integration performing active SQL JOINs to display Customer Name, Address, TID, SNR, Attenuation, ONT type, and outstanding billing dues in a single sheet.

---

## 3. Technology Stack

*   **Frontend:** Next.js (React), Three.js (React Three Fiber), WebGL, Vanilla CSS (Glassmorphism & Neon Cyberpunk palette).
*   **Backend:** FastAPI (Python), Uvicorn.
*   **AI Swarm:** LangGraph, LangChain, Google Gemini Pro (multimodal reasoning and premium voice generation).
*   **Databases:** SQLite3 (CRM & NMS), pgvector/ChromaDB (Troubleshooting Guides RAG).
*   **Voice Engine:** ElevenLabs API Proxy (automated fallback to gTTS).
*   **Hosting Architecture:** Vercel (Frontends), Render/AWS EC2 (FastAPI), Supabase (Auth, PostgreSQL Database, and Storage).

---

## 4. 3-Minute Live Demo Pitch Script (For Stage Presentation)

*Here is the exact step-by-step walkthrough to present SLT NEXUS to the judges:*

### **[Minute 0:00 - The Hook]**
> *"Good morning, esteemed judges. Sri Lanka is digitalizing, but telecom customer support is still stuck in long hotline queues and physical office counters. Furthermore, over 400,000 deaf and mute Sri Lankans are completely excluded from independent kiosk services. Today, we present **SLT NEXUS**—Sri Lanka's first unified, multi-agent 3D AI ecosystem."*

### **[Minute 1:00 - Showcasing B2C & 3D LIYA]**
> *"On the screen is **LIYA**, our real-time 3D AI assistant. Let’s type a simple query in Sinhala: 'මගේ කනෙක්ෂන් එක ස්ලෝ වගේ'.*
> *(Show Chat Panel returning the response in Sinhala, LIYA's mouth syncing perfectly with the audio).*
> *Notice how **Pulse B2C Agent** immediately flags the intent, runs a quick router check in the background, and gives a friendly self-fix advice. But what if the customer is deaf or mute?"*

### **[Minute 1:45 - The Accessibility WoW Factor]**
> *(Click the 📷 Camera icon next to LIYA's header).*
> *"By clicking the camera icon, we enter **Deaf & Mute Accessibility Kiosk Mode**. Our system utilizes **Google MediaPipe Hand Gesture Recognition**—simulated here on our webcam stream. When the customer shows a sign like `🔧 Fault Sign`, our **Signa Agent** instantly decodes it, triggers a diagnostic ticket, and LIYA visually communicates the resolution back. This brings unparalleled digital inclusion to SLT-MOBITEL."*

### **[Minute 2:30 - Showcasing B2B Field Technician Power]**
> *"NEXUS is not just for customers. When a field technician approaches, he logs in via our B2B Staff interface and requests diagnostics for number `0112345678`. *
> *(Type/click technician query).*
> *Look at the screen! Our **Oracle B2B Agent** connects via our relational SQLite database, pulls real-time SNR, Optical Power levels (-26.4 dBm), and TID, and formats a dense, technical diagnostic sheet. Our **Analyzer Agent** then automatically compiles the workforce shift reports and schedules email alerts to regional managers."*

### **[Minute 3:00 - The Conclusion]**
> *"Powered by Next.js on Vercel, Supabase PostgreSQL with Row Level Security, and a 12-agent LangGraph Swarm on Render/AWS, SLT NEXUS is ready for enterprise-grade production deployment.*
> *SLT NEXUS: Connecting minds, empowering staff, and leaving no Sri Lankan behind. Thank you!"*
