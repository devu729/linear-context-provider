# 🚀 Linear–Nia Context Bridge

An automated infrastructure bridge that injects real-time codebase context from **Nia AI** into **Linear** issues — eliminating context-switching the moment a task is assigned.

---

## 🎥 Demo

▶️ **Watch the Demo Video**
https://github.com/devu729/linear-context-provider/blob/main/linear-nia-bridge.mp4

<video src="https://raw.githubusercontent.com/devu729/linear-context-provider/main/linear-nia-bridge.mp4" controls width="800"></video>

---

## 📉 The Problem

Developers waste **10–15 minutes per ticket** “orienting” themselves: tracing legacy code, hunting for relevant files, and mentally mapping implementation details before writing a single line of code.

---

## 📈 The Solution

When a Linear issue is tagged with the `nia` label, this bridge automatically:

1. **Triggers** a secure Node.js middleware via webhooks.
2. **Consults** your actual codebase using Nia's deep-indexing engine.
3. **Injects** a structured implementation guide directly into the Linear comment thread.

---

## ✨ Features

### 🤖 Proactive Context Injection

Shifts AI from reactive chat to proactive planning — architectural guidance arrives before the developer even opens their IDE.

### 🛡️ Resilience: The Self-Healing Layer

Detects Nia router conflicts (400 errors) caused by technical titles and automatically reformulates queries using a regex-cleaned **“Nuclear Fallback”** pattern.

### ⚡ Intelligent State Management

In-memory deduplication and a **10-minute automated cleanup cycle** prevent redundant API calls, race conditions, and infinite loops.

### 🎯 Pure Code-Search Mode

Force-configured to bypass web-search hallucinations, ensuring every suggestion is grounded in your actual project architecture.

---

## 🛠️ Quick Start

### Prerequisites

* Node.js **v18+**
* Linear API Key *(Settings → API)*
* Nia API Key *(Nia Dashboard)*

---

## 📦 Installation

```bash
# Clone the repository (folder is created automatically)
git clone https://github.com/devu729/linear-context-provider.git
cd linear-context-provider

# Install production dependencies
npm install
```

---

## ⚙️ Configuration

Create a `.env` file in the root directory:

```bash
LINEAR_API_KEY=lin_api_...
NIA_API_KEY=nia_...
REPO_NAME=your-username/your-repo
NIA_LABEL=nia
PORT=3000
```

---

## ▶️ Run the Bridge

```bash
# Start the production bridge
node server.js
```

Expose your local server to Linear webhooks (choose one):

```bash
# Option 1 — Pinggy
ssh -p 443 -R0:localhost:3000 a.pinggy.io

# Option 2 — Ngrok
ngrok http 3000
```

---

## 🧠 Technical Deep Dive: The Self-Healing Layer

Technical titles (e.g., `Fix auth.js OAuth flow`) can occasionally cause AI routers to misidentify query intent.
This bridge implements a **Resilience Pattern**:

1. **Intercept** → Catch `400` status codes at the API layer.
2. **Sanitize** → Strip non-alphanumeric noise using regex normalization.
3. **Retry** → Recursively resubmit a simplified query to force successful Code Search.

This ensures a near **100% answer rate**, regardless of how technical or noisy the issue title is.

---

## 📄 License

MIT License
