---
problem: "Post-pipeline editing is slow and friction-heavy when done through Claude Code conversation"
date: 2026-04-07
adr: "editing-ui-adr-2026-04-07.md"
---

# Implementation Plan: Editing UI

## Summary

Build a local web-based editing UI (`/verbatim:edit`) that lets the author visually edit polished articles with both manual typing and AI-assisted edits via Claude Code CLI. BlockNote editor in a browser, Bun server on localhost, `claude -p` for AI edits with voice profile context.

## Tasks

### Task 0: Validate BlockNote markdown round-tripping

**Files:** `editing-ui/tests/markdown-roundtrip.ts`

Write a script that loads a real verbatim draft into BlockNote's markdown parser, converts it to blocks, then serializes back to markdown. Diff the input and output. This is the kill-switch test — if round-tripping is lossy in ways that matter, we need to address it before building anything else.

**Verify:** `bun run editing-ui/tests/markdown-roundtrip.ts`
**Expect:** Input and output markdown are identical, or differences are cosmetic only (trailing whitespace, blank lines). No content loss, no heading reformatting, no syntax mangling.

---

### Task 1: Scaffold the Bun server

**Files:** `editing-ui/server.ts`, `editing-ui/package.json`

Create a minimal Bun HTTP server that:
- Serves static files from `editing-ui/public/`
- Exposes `GET /api/article` — reads the markdown file path passed as CLI arg, returns content
- Exposes `POST /api/save` — receives markdown string, writes to the file on disk
- Listens on a random available port on `127.0.0.1`
- Prints the URL to stdout

**Verify:** `cd editing-ui && bun install && bun run server.ts ../README.md` then `curl http://127.0.0.1:<port>/api/article`
**Expect:** Returns the contents of README.md as plain text. Server starts in <1 second.

---

### Task 2: BlockNote editor frontend

**Files:** `editing-ui/public/index.html`, `editing-ui/src/App.tsx`, `editing-ui/src/Editor.tsx`

Set up a minimal React app with BlockNote that:
- Fetches the article from `GET /api/article` on load
- Parses markdown into BlockNote blocks
- Renders the article in a clean, readable layout
- Supports full manual editing (typing, deleting, adding blocks)
- Has a "Save" button that serializes blocks back to markdown and POSTs to `/api/save`

**Verify:** Start server with a test markdown file, open in browser, make a manual edit, click save, check file on disk
**Expect:** Manual edits are reflected in the saved markdown file. Article renders correctly.
**Depends on:** Task 0 (markdown round-tripping validated), Task 1

---

### Task 3: AI edit endpoint

**Files:** `editing-ui/server.ts`, `editing-ui/src/prompts.ts`

Add `POST /api/edit` endpoint to the Bun server that:
- Accepts `{ selected_text: string, instruction: string, file_path: string }`
- Reads the voice profile from the project root (`voice-profile.md`) if it exists, falls back to default voice constraints
- Constructs a prompt: voice profile + selected text + instruction + file path (so Claude can Read the full article if needed)
- Runs `claude -p "<prompt>" --output-format stream-json --allowedTools "Read"`
- Streams the response back to the client via SSE

**Verify:** `curl -X POST http://127.0.0.1:<port>/api/edit -H 'Content-Type: application/json' -d '{"selected_text": "This is a test paragraph.", "instruction": "make it shorter", "file_path": "test.md"}'`
**Expect:** Returns a streamed response with Claude's edited text. Voice profile is included in the prompt when available.
**Depends on:** Task 1

---

### Task 4: AI edit UI in BlockNote

**Files:** `editing-ui/src/AIEditMenu.tsx`, `editing-ui/src/Editor.tsx`

Add the AI edit workflow to the BlockNote editor:
- User selects one or more blocks
- A floating menu or keyboard shortcut (Cmd+E) opens an instruction input
- User types edit instruction, hits Enter
- Frontend POSTs to `/api/edit` with selected text + instruction
- Response streams in, showing progress
- When complete, show inline diff: original text dimmed, new text highlighted
- Accept button replaces the selection with the edit
- Reject button keeps the original

**Verify:** Start server with a test article, select a paragraph, trigger AI edit with "make this more conversational", observe streaming response and inline diff
**Expect:** Edit streams in visibly, diff is shown inline, accept replaces text, reject keeps original. Full round-trip works.
**Depends on:** Task 2, Task 3

---

### Task 5: `/verbatim:edit` skill

**Files:** `skills/edit/SKILL.md`

Create the Claude Code skill that:
- Accepts a file path argument (e.g., `/verbatim:edit tmp-article/draft.md`)
- Validates the file exists
- Starts the Bun server with the file path as argument
- Opens the user's default browser to the server URL
- Tells the user the server is running and how to stop it (Ctrl+C)

**Verify:** Run `/verbatim:edit` with a test markdown file
**Expect:** Browser opens with the article loaded in BlockNote. User can edit manually and with AI. Save writes back to disk.
**Depends on:** Task 4

---

### Task 6: Integration test with real draft

**Files:** N/A (manual test)

Run the full workflow end-to-end with a real verbatim draft:
1. Run `/verbatim:polish-pipeline` on a real transcript
2. Run `/verbatim:edit` on the resulting draft
3. Make 3-5 AI edits of different types (tighten phrasing, add content, restructure)
4. Make 2-3 manual edits
5. Save and verify the final markdown

**Verify:** Diff the saved file against the original draft
**Expect:** All edits (AI and manual) are preserved. Markdown is clean. No formatting artifacts. Voice profile was respected in AI edits.
**Depends on:** Task 5

## Definition of Done

- [ ] Task 0: Markdown round-tripping validated (or issues documented and addressed)
- [ ] Task 1: Bun server starts, serves files, reads/writes markdown
- [ ] Task 2: BlockNote renders article, manual editing works, save works
- [ ] Task 3: AI edit endpoint streams Claude responses with voice profile
- [ ] Task 4: Select -> instruct -> stream -> inline diff -> accept/reject works
- [ ] Task 5: `/verbatim:edit` skill launches the full UI
- [ ] Task 6: End-to-end test with real draft passes
