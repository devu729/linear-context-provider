Nia-Linear Bridge 🚀
An automated AI agent that bridges Linear and Nia to provide proactive code analysis. The moment a ticket is labeled in Linear, Nia scans your repository and posts a technical implementation guide directly as a comment.

🛠 Features
Proactive Triage: Moves AI from a reactive chat to a proactive planning tool.

Self-Healing Logic: Custom middleware that detects Nia Router conflicts (400 errors) and automatically reformulates queries for higher reliability.

Deduplication & Caching: Built-in state management to prevent redundant API calls and infinite loop protection during auto-assignment.

Context-Aware: Specifically configured to use code search mode to ensure implementation guides are consistent with existing architecture.

🏗 Project Structure
server.js: The production Express server handling real-time webhooks.

test-linear.js: Manual test suite for verifying Nia context retrieval.

get-id.js: Helper utility for Linear authentication and User ID retrieval.

.env.example: Template for environment configuration.

🚀 Setup & Installation
1. Prerequisites
Node.js (v18+)

A Linear account and API Key.

A Nia API Key.

2. Environment Configuration
Create a .env file in the root directory:

Code snippet
LINEAR_API_KEY=lin_api_...
NIA_API_KEY=nia_...
REPO_NAME=your-username/your-repo
NIA_LABEL=nia
PORT=3000
3. Running the Bridge
Bash
# Install dependencies
npm install

# Start the server
node server.js

# Expose your local port (using Pinggy or Ngrok)
ssh -p 443 -R0:localhost:3000 a.pinggy.io
🧠 Engineering Highlights: The "Self-Healing" Layer
One of the unique challenges solved in this project was handling Intent Conflicts in AI routing. Technical issue titles (e.g., containing .js or specific library names) often cause API routers to switch from "Code Search" to "Web Search," resulting in 400 errors.

This bridge implements a Nuclear Fallback pattern:

Detect: Intercepts 400 status codes from the Nia API.

Clean: Strips technical noise and special characters from the query.

Retry: Automatically resubmits a "Simplified Query" to ensure the developer always gets an answer.

🤝 Contributing
This was built as a proof-of-concept for integrating Nia's deep repository knowledge into the project management layer. Feel free to fork and extend!