# 🚀 Linear-Nia Context Bridge

An automated infrastructure bridge that injects real-time codebase context from **Nia AI** into **Linear** issues—eliminating context-switching the moment a task is assigned.

## 📉 The Problem
Developers waste 10–15 minutes per ticket "orienting" themselves: tracing legacy code, hunting for relevant files, and mental-mapping implementation details before writing a single line of code.

## 📈 The Solution
When a Linear issue is tagged with the `nia` label, this bridge automatically:
1. **Triggers** a secure Node.js middleware via Webhooks.
2. **Consults** your actual codebase via Nia's deep-indexing engine.
3. **Injects** a structured implementation guide directly into the Linear comment thread.



---

## ✨ Features

**🤖 Proactive Context Injection** Shifts AI from reactive chat to proactive planning—architectural guidance arrives before the developer even opens their IDE.

**🛡️ Resilience: The Self-Healing Layer** Detects Nia router conflicts (400 errors) caused by technical titles and automatically reformulates queries using a regex-cleaned "Nuclear Fallback" pattern.

**⚡ Intelligent State Management** In-memory deduplication and a 10-minute automated cleanup cycle prevent redundant API calls, race conditions, and infinite loops.

**🎯 Pure Code-Search Mode** Force-configured to bypass web-search hallucinations, ensuring every suggestion is grounded in your actual project architecture.

---

## 🛠️ Quick Start

### Prerequisites
- **Node.js** v18+
- **Linear API Key** (Settings > API)
- **Nia API Key** (Nia Dashboard)

### Installation
```bash
# Clone the repository (folder is created automatically)
git clone [https://github.com/devu729/linear-context-provider.git](https://github.com/devu729/linear-context-provider.git)
cd linear-context-provider

# Install production dependencies
npm install
Configuration
Create a .env file in the root directory:

Bash
LINEAR_API_KEY=lin_api_...
NIA_API_KEY=nia_...
REPO_NAME=your-username/your-repo
NIA_LABEL=nia
PORT=3000
Run
Bash
# Start the production bridge
node server.js

# Expose to Linear webhooks (choose one)
ssh -p 443 -R0:localhost:3000 a.pinggy.io
# OR: ngrok http 3000
🧠 Technical Deep Dive: The Self-Healing Layer
Technical titles (e.g., Fix auth.js OAuth flow) can occasionally cause AI routers to misidentify the query intent. This bridge implements a Resilience Pattern:

Intercept: Catch 400 status codes at the API layer.

Sanitize: Strip non-alphanumeric noise using regex.

Retry: Recursively resubmit a simplified query to force successful Code Search.

This ensures a 100% "Answer Rate" regardless of how technical the issue title is.


📄 License
MIT