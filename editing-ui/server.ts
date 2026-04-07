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
