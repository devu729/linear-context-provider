import express from 'express';
import { LinearClient } from '@linear/sdk';
import 'dotenv/config';

const app = express();
app.use(express.json());

const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
const REPO_NAME = process.env.REPO_NAME;
const NIA_LABEL = process.env.NIA_LABEL || "nia";

// Prevent duplicate processing
const processedIssues = new Set();
const responseCache = new Map();

async function queryNiaAPI(issueTitle, issueDescription, useSimplifiedQuery = false) {
  const cacheKey = issueTitle.toLowerCase().trim();
  
  if (responseCache.has(cacheKey)) {
    console.log(`[Cache] Using cached response for: ${cacheKey}`);
    return responseCache.get(cacheKey);
  }

  const query = useSimplifiedQuery
    ? `Task: Use code in ${REPO_NAME} to resolve: ${issueTitle.replace(/[./\\_]/g, ' ')}`
    : `Using ONLY the repository ${REPO_NAME}, explain how to: ${issueTitle}. Context: ${issueDescription || ''}`;

  console.log(`[Nia] Querying API${useSimplifiedQuery ? ' (simplified)' : ''}...`);

  try {
    const response = await fetch("https://apigcp.trynia.ai/v2/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: query }],
        search_mode: "code",
        resource_ids: [REPO_NAME],
        model_name: "gpt-4o"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Retry with simplified query on 400 errors
      if (response.status === 400 && !useSimplifiedQuery) {
        console.warn(`[Nia] 400 error, retrying with simplified query`);
        return queryNiaAPI(issueTitle, "", true);
      }
      
      console.error(`[Nia] Error ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || data.content || data.message;
    
    if (result) {
      responseCache.set(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    console.error(`[Nia] Network error:`, error.message);
    return null;
  }
}

async function hasNiaComment(issueId) {
  try {
    const issue = await linearClient.issue(issueId);
    const comments = await issue.comments();
    return comments.nodes.some(comment => 
      comment.body?.includes("Nia Auto-Analysis")
    );
  } catch (error) {
    console.error(`[Linear] Error checking comments:`, error.message);
    return false;
  }
}

async function postAnalysisComment(issueId, analysis) {
  const body = `### Nia Auto-Analysis\n\n${analysis}\n\n---\n*Generated via Nia Bridge*`;
  
  try {
    await linearClient.createComment({ issueId, body });
    console.log(`[Linear] Comment posted to issue ${issueId}`);
    return true;
  } catch (error) {
    console.error(`[Linear] Failed to post comment:`, error.message);
    return false;
  }
}

async function autoAssignIssue(issueId, currentAssigneeId) {
  if (currentAssigneeId) return;
  
  try {
    const me = await linearClient.viewer;
    await linearClient.updateIssue(issueId, { assigneeId: me.id });
    console.log(`[Linear] Auto-assigned issue ${issueId} to ${me.email}`);
  } catch (error) {
    console.error(`[Linear] Failed to auto-assign:`, error.message);
  }
}

function shouldProcessIssue(data, action, updatedFrom) {
  const hasNiaLabel = data.labels?.some(label => 
    label.name.toLowerCase() === NIA_LABEL.toLowerCase()
  );
  
  if (!hasNiaLabel) return false;
  if (processedIssues.has(data.id)) return false;
  
  // Skip if only assignee changed (prevents loops)
  if (action === 'update' && updatedFrom) {
    const keys = Object.keys(updatedFrom);
    if (keys.length === 1 && keys[0] === 'assigneeId') {
      return false;
    }
  }
  
  return true;
}

app.post('/webhook', async (req, res) => {
  const { action, data, type, updatedFrom } = req.body;

  if (type !== 'Issue' || !['create', 'update'].includes(action)) {
    return res.sendStatus(200);
  }

  if (!shouldProcessIssue(data, action, updatedFrom)) {
    return res.sendStatus(200);
  }

  if (await hasNiaComment(data.id)) {
    processedIssues.add(data.id);
    return res.sendStatus(200);
  }

  console.log(`[Webhook] Processing issue: ${data.title}`);
  processedIssues.add(data.id);

  const analysis = await queryNiaAPI(data.title, data.description);

  if (analysis) {
    await postAnalysisComment(data.id, analysis);
    await autoAssignIssue(data.id, data.assigneeId);
  }

  res.sendStatus(200);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    repo: REPO_NAME,
    cacheSize: responseCache.size,
    processedCount: processedIssues.size
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Nia Bridge running on port ${PORT}`);
  console.log(`[Config] Repository: ${REPO_NAME}`);
  console.log(`[Config] Label filter: ${NIA_LABEL}`);
});