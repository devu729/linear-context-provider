import { LinearClient } from '@linear/sdk';
import 'dotenv/config';

// Initialize the Linear Client
const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

/**
 * Step 1: Query the Nia API for code context
 */
async function getNiaContext(issueTitle, issueDescription) {
  const query = `Find code related to: ${issueTitle}. ${issueDescription || ''}`;
  
  const USE_REAL_NIA = true; 

  if (!USE_REAL_NIA) {
    console.log("🛠️ [MOCK] Nia is analyzing: " + issueTitle);
    return [
      { file: "test-linear.js", snippet: "const linearClient = new LinearClient(...);" }
    ];
  }

  console.log("📡 Sending real query to Nia...");

  try {
    const response = await fetch("https://apigcp.trynia.ai/v2/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // Updated to include the 'messages' field required by Nia
        messages: [
          { role: "user", content: query }
        ],
        search_mode: "unified"
      })
    });
    
    const data = await response.json();
    
    // We keep this log so we can see how Nia structures the successful search results
    console.log("🔍 Nia Raw Response:", JSON.stringify(data, null, 2));
    
    // Nia v2 usually returns an array in 'results'
    return data.results || data.matches || []; 
  } catch (error) {
    console.error("❌ Nia API Error:", error.message);
    return [];
  }
}

/**
 * Step 2: Post the found context back to Linear as a comment
 */
async function postCommentToLinear(issueId, context) {
  if (context.length === 0) return;

  const commentHeader = "🤖 **Nia-Link: Relevant Code Context Found**\n\n";
  
  const commentBody = context.map(res => {
    const fileName = res.file_path || res.file || "Unknown File";
    const snippetText = res.content || res.snippet || "No snippet available";
    return `* **File:** \`${fileName}\` \n  \`\`\`javascript\n  ${snippetText}\n  \`\`\``;
  }).join('\n\n');

  try {
    await linearClient.createComment({
      issueId: issueId,
      body: commentHeader + commentBody
    });
    console.log("📝 Successfully posted context to Linear!");
  } catch (error) {
    console.error("❌ Linear Comment Error:", error.message);
  }
}

/**
 * MAIN WORKFLOW
 */
async function run() {
  try {
    console.log("--- Starting Nia-Linear Bridge ---");
    const me = await linearClient.viewer;
    console.log(`👤 Authenticated as: ${me.name}`);

    const issues = await me.assignedIssues();

    if (issues.nodes.length > 0) {
      const issue = issues.nodes[0];
      console.log(`✅ Processing Issue: "${issue.title}"`);

      // 1. Get Context from Nia
      const context = await getNiaContext(issue.title, issue.description);
      
      if (context && context.length > 0) {
        console.log(`🎯 Nia found ${context.length} relevant snippets.`);
        // 2. Post to Linear
        await postCommentToLinear(issue.id, context);
      } else {
        console.log("ℹ️ Nia returned no matches. Check if the issue title matches your code.");
      }

    } else {
      console.log("📭 0 issues assigned to you. Assign the 'Refactor' issue in Linear first.");
    }
  } catch (error) {
    console.error("🚨 Workflow Error:", error.message);
  }
}

run();