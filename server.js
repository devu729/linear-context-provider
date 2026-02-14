import express from 'express';
import { LinearClient } from '@linear/sdk';
import 'dotenv/config';

const app = express();
app.use(express.json());

// 1. Configuration
const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
const REPO_NAME = process.env.REPO_NAME;
const NIA_LABEL = process.env.NIA_LABEL || "nia";

const processedIssues = new Set();

/**
 * Queries the Nia API with high-priority context instructions
 */
async function queryNiaAPI(issueTitle) {
  console.log(`[Nia] 🛰️  Requesting Deep Analysis for: ${issueTitle}`);

  try {
    const response = await fetch("https://apigcp.trynia.ai/v2/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{ 
          role: "user", 
          content: `You are a Senior Engineer. Search the repository ${REPO_NAME} and explain exactly how to implement the following issue in the code: ${issueTitle}. Provide specific code snippets from the existing files.` 
        }],
        search_mode: "code",
        resource_ids: [REPO_NAME],
        model_name: "gpt-4o"
      })
    });

    const data = await response.json();
    
    // Deep inspection to catch the AI response in any field
    const result = data.choices?.[0]?.message?.content || 
                   data.answer || 
                   data.content || 
                   data.message;

    if (!result) {
      console.log("[Nia] ❌ API responded but result field is empty.");
      console.log("[DEBUG] Raw API Response:", JSON.stringify(data));
      return null;
    }

    console.log("[Nia] ✅ AI analysis successfully generated.");
    return result;

  } catch (error) {
    console.error(`[Nia] ❌ Network/Fetch Error:`, error.message);
    return null;
  }
}

/**
 * Webhook Route
 */
app.post('/webhook', async (req, res) => {
  const { action, data, type } = req.body;

  // 1. Initial Filters
  if (type !== 'Issue' || !['create', 'update'].includes(action)) return res.sendStatus(200);

  const hasLabel = data.labels?.some(l => l.name.toLowerCase() === NIA_LABEL.toLowerCase());
  if (!hasLabel || processedIssues.has(data.id)) return res.sendStatus(200);

  // 2. Immediate Response (Prevents Linear/Pinggy timeouts)
  res.sendStatus(200);

  console.log(`\n[Webhook] Incoming: "${data.title}"`);
  processedIssues.add(data.id);

  // 3. Get AI Insight
  const analysis = await queryNiaAPI(data.title);

  // 4. Post back to Linear
  if (analysis) {
    try {
      console.log(`[Linear] Posting analysis to issue ${data.id}...`);
      await linearClient.createComment({ 
        issueId: data.id, 
        body: `### 🤖 Nia Architectural Review\n\n${analysis}\n\n---\n*Verified via Nia-Linear Bridge*` 
      });

      // Optional: Auto-assign the issue to the person who triggered the AI
      const me = await linearClient.viewer;
      await linearClient.updateIssue(data.id, { assigneeId: me.id });

      console.log(`[Linear] ✅ SUCCESS: Workflow complete.`);
    } catch (err) {
      console.error(`[Linear] ❌ Failed to post comment:`, err.message);
    }
  } else {
    console.log(`[Bridge] ⚠️ No analysis to post. Check Nia indexing status.`);
    processedIssues.delete(data.id); // Allow a retry if fixed
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 BRIDGE ONLINE - Port ${PORT}`);
  console.log(`📂 Repository: ${REPO_NAME}`);
  console.log(`🏷️  Active Label: ${NIA_LABEL}\n`);
});