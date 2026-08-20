import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { TOOL_SCHEMAS, runAdvisorTool } from "@/lib/advisorTools";
import { ADVISOR_SYSTEM_PROMPT } from "@/lib/advisorPrompt";

// Plain fetch against the Messages API instead of pulling in the Anthropic
// SDK -- one fewer dependency, and this route only ever needs a single
// endpoint. anthropic-version is the API's own versioning scheme, separate
// from the model string.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 6;

async function callClaude(messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it in Vercel project settings to enable the tax advisor.");
  }
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1536,
      system: ADVISOR_SYSTEM_PROMPT,
      tools: TOOL_SCHEMAS,
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

function extractText(content) {
  return (content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Deliberately stateless across turns beyond the plain-text transcript the
// client sends back each time: no tool_use/tool_result bookkeeping is
// persisted between requests. Every user question gets its own fresh tool
// calls against current data, which is what you want for something whose
// whole value is "your real, up-to-date numbers" -- not a five-minute-old
// cached fetch from earlier in the conversation.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const history = Array.isArray(body.messages) ? body.messages : [];
  if (!history.length) {
    return Response.json({ error: "No messages." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const ctx = { admin, userId: user.id };

  let messages = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));

  const toolsUsed = new Set();

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const resp = await callClaude(messages);

      if (resp.stop_reason === "tool_use") {
        messages = [...messages, { role: "assistant", content: resp.content }];
        const toolResults = [];
        for (const block of resp.content) {
          if (block.type !== "tool_use") continue;
          toolsUsed.add(block.name);
          const result = await runAdvisorTool(block.name, block.input, ctx);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
        messages = [...messages, { role: "user", content: toolResults }];
        continue;
      }

      const text = extractText(resp.content) || "I wasn't able to put together an answer that time -- try rephrasing the question.";
      return Response.json({ reply: text, toolsUsed: Array.from(toolsUsed) });
    }

    return Response.json({
      reply: "That question needed more digging than I could finish in one go -- try breaking it into a smaller question.",
      toolsUsed: Array.from(toolsUsed),
    });
  } catch (err) {
    return Response.json({ error: err.message || "The advisor hit an error." }, { status: 500 });
  }
}
