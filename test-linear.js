import { LinearClient } from '@linear/sdk';
import 'dotenv/config';

const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

// --- NIA SEARCH WRAPPER ---
async function getNiaContext(issueTitle, issueDescription) {
  const query = `${issueTitle} ${issueDescription || ''}`;
  
  // SAFE MODE: Set this to 'true' only when you want to use a real credit
  const USE_REAL_NIA = false; 

  if (!USE_REAL_NIA) {
    console.log("🛠️ [MOCK] Nia is analyzing: " + issueTitle);
    return [
      { file: "src/auth/middleware.ts", snippet: "const TOKEN_EXPIRY = '5m';" },
      { file: "src/config/session.config.js", snippet: "timeout: 300000 // 5 minutes" }
    ];
  }

  // REAL API CALL (Only runs if USE_REAL_NIA is true)
  const response = await fetch("https://apigcp.trynia.ai/v2/universal-search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NIA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: query,
      search_mode: "unified"
    })
  });
  
  const data = await response.json();
  return data.results; 
}

// --- MAIN WORKFLOW ---
async function run() {
  try {
    const me = await linearClient.viewer;
    const issues = await me.assignedIssues();

    if (issues.nodes.length > 0) {
      const issue = issues.nodes[0];
      console.log(`\n✅ Found Issue: "${issue.title}"`);

      // 1. Get Context from Nia
      const context = await getNiaContext(issue.title, issue.description);
      
      console.log("\n📍 Nia suggests checking these files:");
      context.forEach(res => {
        console.log(`- ${res.file}: "${res.snippet}"`);
      });

      // 2. Next Goal: Post this back to Linear as a comment!
      console.log("\n🚀 Ready to post context back to Linear...");

    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

run();