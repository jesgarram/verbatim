import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { spawn } from "child_process";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: bun run server.ts <markdown-file>");
  process.exit(1);
}

const resolvedPath = resolve(filePath);

if (!existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const publicDir = join(import.meta.dir, "public");
const projectRoot = dirname(resolvedPath);
const repoRoot = join(import.meta.dir, "..");

// Try to load voice profile from project root or parent directories
function findVoiceProfile(): string | null {
  let dir = projectRoot;
  for (let i = 0; i < 5; i++) {
    const profilePath = join(dir, "voice-profile.md");
    if (existsSync(profilePath)) {
      return readFileSync(profilePath, "utf-8");
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function buildEditPrompt(selectedText: string, instruction: string): string {
  const voiceProfile = findVoiceProfile();

  let prompt = "";

  if (voiceProfile) {
    prompt += `<voice-profile>\n${voiceProfile}\n</voice-profile>\n\n`;
  }

  if (!voiceProfile) {
    prompt += `(No voice profile loaded. Edit based on the text's existing tone and style.)\n\n`;
  }

  prompt += `You are a prose editor. Your job is to edit the selected text according to the instruction below.

Rules:
- Return ONLY the edited text. No explanations, no preamble, no markdown code fences.
- NEVER return empty text. You must always return a version of the selected text, even if minimally changed.
- The edited text should be roughly similar in length to the original. Do not drastically shorten or delete content unless the instruction explicitly asks for it.
- Preserve the speaker's authentic voice. If a voice profile is provided, follow it strictly. If not, match the tone and style already present in the text.
- Do not add ideas, examples, or opinions that aren't in the original or implied by the instruction.
- Do not use AI-sounding phrases (leverage, dive deep, game-changer, in today's landscape, etc.)

The full article is at: ${resolvedPath}
You may Read this file if you need surrounding context for the edit.

<selected-text>
${selectedText}
</selected-text>

<instruction>
${instruction}
</instruction>

Return the edited text now:`;

  return prompt;
}

// --- Critique types and helpers ---

interface CritiqueIssue {
  id: string;
  priority: "high" | "medium" | "low";
  location: string;
  principle: string;
  problem: string;
  readerImpact: string;
  direction: string;
}

function buildCritiquePrompt(articleMarkdown: string): string | null {
  const criticPath = join(repoRoot, "skills", "refine", "references", "critic-prompt.md");
  const principlesPath = join(repoRoot, "skills", "refine", "references", "refinement-principles.md");

  if (!existsSync(criticPath)) {
    console.error(`Critic prompt not found: ${criticPath}`);
    return null;
  }
  if (!existsSync(principlesPath)) {
    console.error(`Refinement principles not found: ${principlesPath}`);
    return null;
  }

  let prompt = readFileSync(criticPath, "utf-8");
  const principles = readFileSync(principlesPath, "utf-8");

  prompt = prompt.replace("{round_number}", "1");
  prompt = prompt.replace("{draft_content}", articleMarkdown);
  prompt = prompt.replace("{refinement_principles}", principles);

  return prompt;
}

function parseCritiqueXML(text: string): {
  issues: CritiqueIssue[];
  summary: string;
  verdict: string;
} {
  const issues: CritiqueIssue[] = [];

  // Extract <feedback> block
  const feedbackMatch = text.match(/<feedback>([\s\S]*?)<\/feedback>/);
  if (!feedbackMatch) {
    console.error("[critique] No <feedback> block found in response");
    return { issues: [], summary: "", verdict: "" };
  }
  const feedbackXml = feedbackMatch[1];

  // Extract each <issue>
  const issueRegex = /<issue\s+priority="(high|medium|low)">([\s\S]*?)<\/issue>/g;
  let issueMatch;
  let index = 0;

  while ((issueMatch = issueRegex.exec(feedbackXml)) !== null) {
    const priority = issueMatch[1] as "high" | "medium" | "low";
    const issueBody = issueMatch[2];

    const extract = (tag: string): string => {
      const m = issueBody.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim() : "";
    };

    let location = extract("location");
    // Strip surrounding quotes
    location = location.replace(/^[""\u201C\u201D]+|[""\u201C\u201D]+$/g, "");

    issues.push({
      id: `critique-${index}`,
      priority,
      location,
      principle: extract("principle"),
      problem: extract("problem"),
      readerImpact: extract("reader_impact"),
      direction: extract("direction"),
    });
    index++;
  }

  // Extract summary and verdict
  const summaryMatch = feedbackXml.match(/<summary>([\s\S]*?)<\/summary>/);
  const verdictMatch = feedbackXml.match(/<verdict>([\s\S]*?)<\/verdict>/);

  return {
    issues,
    summary: summaryMatch ? summaryMatch[1].trim() : "",
    verdict: verdictMatch ? verdictMatch[1].trim() : "",
  };
}

async function handleCritique(req: Request): Promise<Response> {
  let body: { markdown: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { markdown } = body;
  if (!markdown) {
    return Response.json({ error: "Missing markdown" }, { status: 400 });
  }

  const prompt = buildCritiquePrompt(markdown);
  if (!prompt) {
    return Response.json({ error: "Could not load critic prompt files" }, { status: 500 });
  }

  return new Promise((resolve) => {
    const proc = spawn("claude", [
      "-p", prompt,
      "--output-format", "json",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", () => {
      if (stderr) console.error("[claude stderr]", stderr);

      try {
        const parsed = JSON.parse(stdout);
        const result = (parsed.result || "").trim();

        if (!result) {
          resolve(Response.json({ error: "Claude returned empty result" }, { status: 500 }));
          return;
        }

        const critique = parseCritiqueXML(result);
        resolve(Response.json(critique));
      } catch {
        resolve(Response.json({ error: "Failed to parse Claude response" }, { status: 500 }));
      }
    });

    proc.on("error", (err) => {
      resolve(Response.json({ error: err.message }, { status: 500 }));
    });
  });
}

// TODO: Add status updates (tool use events) via SSE streaming
// For now using simple JSON request/response for reliability
async function handleEdit(req: Request): Promise<Response> {
  let body: { selected_text: string; instruction: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { selected_text, instruction } = body;
  if (!selected_text || !instruction) {
    return Response.json({ error: "Missing selected_text or instruction" }, { status: 400 });
  }

  const prompt = buildEditPrompt(selected_text, instruction);

  return new Promise((resolve) => {
    const proc = spawn("claude", [
      "-p", prompt,
      "--output-format", "json",
      "--allowedTools", "Read",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", () => {
      if (stderr) console.error("[claude stderr]", stderr);

      try {
        const parsed = JSON.parse(stdout);
        const result = (parsed.result || "").trim();

        if (!result) {
          resolve(Response.json({ error: "Claude returned empty result" }, { status: 500 }));
          return;
        }

        resolve(Response.json({ result }));
      } catch {
        resolve(Response.json({ error: "Failed to parse Claude response" }, { status: 500 }));
      }
    });

    proc.on("error", (err) => {
      resolve(Response.json({ error: err.message }, { status: 500 }));
    });
  });
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);

    // API: Read article
    if (url.pathname === "/api/article" && req.method === "GET") {
      const content = readFileSync(resolvedPath, "utf-8");
      return new Response(content, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // API: Save article
    if (url.pathname === "/api/save" && req.method === "POST") {
      const body = await req.text();
      writeFileSync(resolvedPath, body, "utf-8");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // API: AI edit
    if (url.pathname === "/api/edit" && req.method === "POST") {
      return handleEdit(req);
    }

    // API: AI critique
    if (url.pathname === "/api/critique" && req.method === "POST") {
      return handleCritique(req);
    }

    // Static files
    let staticPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const fullPath = join(publicDir, staticPath);

    const file = Bun.file(fullPath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Verbatim editor: http://${server.hostname}:${server.port}`);
console.log(`Editing: ${resolvedPath}`);
console.log(`Voice profile: ${findVoiceProfile() ? "found" : "not found"}`);
console.log("Press Ctrl+C to stop.");
