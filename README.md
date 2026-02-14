# Nia-Linear Bridge

An automated bridge that injects code context from Nia into Linear issues—eliminating context-switching time when developers pick up new tasks.

## The Problem

Developers waste 10-15 minutes per ticket gathering context: reading old code, checking documentation, and understanding implementation details before they can start work.

## The Solution

When an issue is labeled in Linear, this bridge automatically:
1. Queries your codebase via Nia
2. Generates a technical implementation guide
3. Posts it as a comment directly in the Linear issue

No manual context gathering. No switching between tools.

---

## Features

**🤖 Proactive Analysis**  
Moves AI from reactive chat to proactive planning—context arrives before you ask.

**🔄 Self-Healing Queries**  
Custom middleware detects Nia router conflicts (400 errors) and automatically reformulates queries with stripped technical noise.

**⚡ Smart Caching**  
In-memory deduplication prevents redundant API calls and infinite loops during auto-assignment.

**🎯 Code-First Search**  
Configured to use `code` search mode exclusively—ensures implementation guides match your actual architecture.

---

## Quick Start

### Prerequisites
- Node.js v18+
- Linear API Key
- Nia API Key

### Installation
```bash
# Clone the repo
git clone https://github.com/yourusername/nia-linear-bridge
cd nia-linear-bridge

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Configuration
```bash
LINEAR_API_KEY=lin_api_...
NIA_API_KEY=nia_...
REPO_NAME=your-username/your-repo
NIA_LABEL=nia
PORT=3000
```

### Run
```bash
# Start the server
node server.js

# Expose to Linear webhooks (choose one)
ssh -p 443 -R0:localhost:3000 a.pinggy.io
ngrok http 3000
```

Configure the webhook URL in Linear → Settings → Webhooks.

---

## Project Structure
```
├── server.js          # Production webhook server
├── test-linear.js     # Manual testing suite
├── get-id.js          # Linear auth helper
└── .env.example       # Environment template
```

---

## Technical Deep Dive: The Self-Healing Layer

### The Challenge

Technical issue titles (e.g., "Fix auth.js OAuth flow") cause Nia's router to switch from Code Search → Web Search, resulting in 400 errors.

### The Solution

Implemented a **nuclear fallback pattern**:

1. **Detect**: Intercept 400 status codes
2. **Clean**: Strip special characters and technical noise from query
3. **Retry**: Resubmit simplified query to force code search mode
```javascript
if (response.status === 400 && !useSimplifiedQuery) {
  return queryNiaAPI(issueTitle, "", true); // Simplified retry
}
```

This ensures developers always get an answer—even when the router misbehaves.

---

## Built With

- Express.js
- Linear SDK
- Nia API v2
- Node.js 18+

---

## Contributing

This is a proof-of-concept for embedding AI repository knowledge directly into project management workflows. Fork and extend as needed.

---

## License

MIT