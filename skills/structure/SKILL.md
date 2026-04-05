---
name: structure
description: Reads a raw transcript and outputs a structured draft ready for polishing. Cleans filler, identifies sections, finds the hook, and tags peak moments. Use when the user has a raw transcript to structure. Triggers on "structure", "structure this transcript", or "organize this transcript".
argument-hint: <transcript-path> [--mode presentation|interview]
---

# Transcript Structurer

Read a raw transcript and produce a clean, structured draft. This is the first transformation step — cleaning and organizing, not polishing.

## Input

Read the transcript from: $ARGUMENTS

Flags:
- `--mode presentation` (default) — speaker had their own structure, preserve it
- `--mode interview` — speaker was responding to questions, extract solo narrative

If no arguments provided, ask the user for a transcript file path.

## Process

### Step 1: Clean the Transcript

Remove verbal artifacts that don't carry meaning:
- **Filler words**: um, uh, like (when filler), you know, sort of, kind of, basically, right (when filler), I mean, so (sentence-starter), actually (when filler), obviously, literally (when not literal)
- **Stutters and false starts**: collapse "I was, I was going to" → "I was going to"
- **Circular repetition**: where the speaker said the same thing twice while finding their words — keep the better version
- **Self-corrections**: "No wait, I mean..." — keep only the corrected version

**Preserve:**
- Intentional repetition used for emphasis
- Dialect and natural grammar ("gonna", "wanna", contractions)
- Discourse markers that carry meaning ("Look," "Here's the thing," "So,")
- The speaker's actual vocabulary — never upgrade or formalize

### Step 2: Identify Mode and Apply

Check the `--mode` flag. Load the appropriate reference:
- Presentation mode: `${CLAUDE_SKILL_DIR}/references/presentation-mode.md`
- Interview mode: `${CLAUDE_SKILL_DIR}/references/interview-mode.md`

Apply the mode-specific structuring rules.

### Step 3: Find the Hook

Scan the full transcript for the most compelling moment:
- A sharp analogy or metaphor
- A surprising claim or contrarian opinion
- A vivid story or anecdote
- A concise statement of the core idea

This becomes the opening. Don't fabricate a hook — find the one already in the material.

### Step 4: Identify Sections

Find natural topic shifts — places where the speaker moves to a new idea, story, or argument. These become section breaks with headers.

Headers should:
- Use the speaker's own words when possible
- Be short and direct (not clever or cute)
- Reflect what the section is actually about

### Step 5: Tag Peak Moments

Mark the gold — moments the polish step should amplify:
- Sharp analogies that make a concept click
- Dry humor or memorable asides
- Surprising claims backed by experience
- Vivid stories or concrete examples
- Strong opinions stated with confidence

Tag these with `<!-- peak: [brief reason] -->` inline so the polish step can find them.

### Step 6: Write the Structured Draft

Create a working folder `tmp-{article}/` at the project root, where `{article}` is the transcript filename without extension (e.g., `transcripts/my-talk.md` → `tmp-my-talk/`).

Output to `tmp-{article}/clean.md`.

The draft should read as a clean, organized version of the transcript — not yet a blog post, but no longer raw speech.

## Output

Write the structured draft and report to the user:
- Number of sections identified
- The hook chosen (and where it came from in the original)
- Number of peak moments tagged
- Any content that was cut and why (so the user can override)
