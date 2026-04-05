---
name: polish-pipeline
description: Chains the full transcript-to-blog pipeline (structure -> polish -> refine) in a single invocation. This is the primary interface for converting transcripts to blog posts. Triggers on "polish pipeline", "full polish", "transcript to blog", or "run the pipeline".
argument-hint: <transcript-path> [--mode presentation|interview]
---

# Polish Pipeline

Run the full transcript-to-blog pipeline in one command. This chains three skills sequentially: structure, polish, and refine.

## Input

Raw transcript file path: $ARGUMENTS

Flags:
- `--mode presentation` (default) — speaker had their own structure
- `--mode interview` — speaker was responding to questions

If no arguments provided, ask the user for a transcript file path.

## Working Folder

All pipeline artifacts live in a temporary folder: `tmp-{article}/` at the project root, where `{article}` is the transcript filename without extension (e.g., `transcripts/my-talk.md` → `tmp-my-talk/`).

Create this folder before running the first step.

## Pipeline

### Step 1: Structure

Run the `/verbatim:structure` skill on the raw transcript with the specified mode.

Input: the raw transcript
Output: `tmp-{article}/clean.md`

Wait for this step to complete before proceeding.

### Step 2: Polish

Run the `/verbatim:polish` skill on the structured draft.

Input: `tmp-{article}/clean.md`
Output: `tmp-{article}/draft.md`

Wait for this step to complete before proceeding.

### Step 3: Refine

Run the `/verbatim:refine` skill on the polished draft.

Input: `tmp-{article}/draft.md`
Output: `tmp-{article}/draft.md` (overwritten with refined version), `tmp-{article}/refine-log.md`

## Output

After all three steps complete:

1. Show the **full blog post** (from `tmp-{article}/draft.md`)
2. Show a **brief summary** of what the refinement changed (from the refine log)
3. Show any **feedback the editor rejected** and why — so the user can override if they disagree
4. Ask the user: **"Does this sound like you? Anything you'd change?"**

The user's answer feeds back into the voice profile over time — if they consistently flag certain patterns, those become new rules.

Tell the user: when you're happy with the draft, move `tmp-{article}/draft.md` to `src/content/blog/[slug].md` and delete the `tmp-{article}/` folder.

## Notes

- If the voice profile doesn't exist yet, the pipeline still works — it uses default voice constraints. But results will be better after running `/verbatim:voice-profile` first.
- Each step produces its own artifact. If the user wants to re-run just one step (e.g., re-polish after editing the clean draft), they can use the individual skills directly.
- The refine step is adversarial by design — a Critic (Red Team) finds quality issues and an Editor (Blue Team) fixes them while protecting the speaker's voice. The tension between them produces better output than either role alone.
- The `tmp-{article}/` folder is the user's workspace — they iterate on `draft.md` until satisfied, then promote it to `src/content/blog/`.
