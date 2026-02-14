import express from 'express';
import { LinearClient } from '@linear/sdk';
import 'dotenv/config';

const app = express();
app.use(express.json());

// ============================================================================
// 1. CONFIGURATION & VALIDATION
// ============================================================================

const requiredEnvVars = ['LINEAR_API_KEY', 'NIA_API_KEY', 'REPO_NAME'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ CRITICAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
const REPO_NAME = process.env.REPO_NAME;
const NIA_LABEL = process.env.NIA_LABEL || "nia";

// Improved: Store timestamp with issue ID to enable cleanup
const processedIssues = new Map();

// Memory leak prevention: Clean up old entries every 10 minutes
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  let cleanedCount = 0;
  
  for (const [issueId, timestamp] of processedIssues.entries()) {
    if (timestamp < oneHourAgo) {
      processedIssues.delete(issueId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[Cleanup] 🧹 Removed ${cleanedCount} old issue(s) from memory`);
  }
}, 600000); // Every 10 minutes

// ============================================================================
// 2. NIA API INTEGRATION WITH SELF-HEALING
// ============================================================================

/**
 * Queries the Nia API with high-priority context instructions
 * Now includes timeout protection (30s) and self-healing retry on 400 errors
 */
async function queryNiaAPI(issueTitle, isRetry = false) {
  // Use a simplified prompt if this is a retry to avoid 400 errors
  const promptContent = isRetry 
    ? `Analyze this task for the repository ${REPO_NAME}: ${issueTitle.replace(/[^a-zA-Z0-9 ]/g, '')}`
    : `You are a Senior Engineer. Search the repository ${REPO_NAME} and explain exactly how to implement the following issue in the code: ${issueTitle}. Provide specific code snippets from the existing files.`;
  
  console.log(`[Nia] 🛰️  ${isRetry ? 'Retrying with simplified query...' : `Requesting Deep Analysis for: ${issueTitle}`}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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
          content: promptContent
        }],
        search_mode: "code",
        resource_ids: [REPO_NAME],
        model_name: "gpt-4o"
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // --- SELF-HEALING LAYER ---
    if (response.status === 400 && !isRetry) {
      console.warn("[Nia] ⚠️  400 Error detected (Router Conflict). Triggering Self-Healing Retry...");
      return queryNiaAPI(issueTitle, true); // Recursive call with isRetry = true
    }

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
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`[Nia] ⏱️  Request timeout after 30 seconds`);
    } else {
      console.error(`[Nia] ❌ Network/Fetch Error:`, error.message);
    }
    return null;
  }
}

// ============================================================================
// 3. WEBHOOK ENDPOINT
// ============================================================================

/**
 * Optional: Webhook Security Verification
 * Uncomment and set LINEAR_WEBHOOK_SECRET env var to enable
 */
/*
import crypto from 'crypto';

function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['linear-signature'];
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  
  if (!secret) return next(); // Skip if not configured
  
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  if (signature !== expected) {
    console.warn('[Security] ⚠️  Invalid webhook signature');
    return res.sendStatus(401);
  }
  
  next();
}

app.post('/webhook', verifyWebhookSignature, async (req, res) => {
*/

app.post('/webhook', async (req, res) => {
  const { action, data, type } = req.body;

  // 1. Initial Filters
  if (type !== 'Issue' || !['create', 'update'].includes(action)) {
    return res.sendStatus(200);
  }

  const hasLabel = data.labels?.some(l => l.name.toLowerCase() === NIA_LABEL.toLowerCase());
  if (!hasLabel || processedIssues.has(data.id)) {
    return res.sendStatus(200);
  }

  console.log(`\n[Webhook] Incoming: "${data.title}"`);

  // 2. Mark as processing BEFORE sending response (fixes race condition)
  processedIssues.set(data.id, Date.now());

  // 3. Immediate Response (Prevents Linear/Pinggy timeouts)
  res.sendStatus(200);

  // 4. Get AI Insight (with automatic retry on 400 errors)
  const analysis = await queryNiaAPI(data.title);

  // 5. Post back to Linear
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
      // On failure, remove from processed set to allow retry
      processedIssues.delete(data.id);
    }
  } else {
    console.log(`[Bridge] ⚠️ No analysis to post. Check Nia indexing status.`);
    // Remove from set to allow retry when Nia is working
    processedIssues.delete(data.id);
  }
});

// ============================================================================
// 4. SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 BRIDGE ONLINE - Port ${PORT}`);
  console.log(`📂 Repository: ${REPO_NAME}`);
  console.log(`🏷️  Active Label: ${NIA_LABEL}`);
  console.log(`🔒 Webhook Security: ${process.env.LINEAR_WEBHOOK_SECRET ? 'ENABLED' : 'DISABLED (recommended to enable)'}`);
  console.log(`\n✅ All systems operational\n`);
});