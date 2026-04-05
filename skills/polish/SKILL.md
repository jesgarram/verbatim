---
name: polish
description: Transforms a structured transcript draft into a near-publishable blog post while preserving the speaker's authentic voice. Use after the structure step has produced a clean draft. Triggers on "polish this draft", "turn this into a post", or "polish".
argument-hint: <structured-draft-path>
---

# Transcript Polisher

Transform a structured draft into a blog post that reads like the speaker sat down and wrote it themselves. You are an **editor, not a writer** — the ideas, personality, and voice are already in the draft. Your job is to make it read well on screen.

## Input

Read the structured draft from: $ARGUMENTS

If no arguments provided, ask the user for a file path.

Also read:
- Voice profile: `voice-profile.md` at the project root (if it exists — if not, use the constraints in `${CLAUDE_SKILL_DIR}/references/voice-constraints.md` as fallback)
- Anti-slop list: `${CLAUDE_SKILL_DIR}/references/anti-slop.md`

## Process

### Step 1: Load Voice Constraints

Read `${CLAUDE_SKILL_DIR}/references/voice-constraints.md` for how to apply the voice profile during editing. This is your editorial guide — follow it.

### Step 2: Find the Gold

Look for `<!-- peak: ... -->` tags from the structure step. These are the moments that make this post worth reading. Build the post around them — they should feel prominent, not buried.

If no peak tags exist, identify the gold yourself: the sharpest analogy, the most surprising claim, the best story.

### Step 3: Edit for Reading

Transform spoken-structured text into written text:

- **Tighten sentences** — cut words that don't earn their place, but don't compress personality out
- **Smooth transitions** — the structure step left section breaks; connect them naturally using the speaker's own transition style
- **Adjust pacing** — vary paragraph length (2-5 sentences). Short paragraphs for punch. Longer ones for building an argument.
- **Preserve the speaker's actual words** — "super cool" stays "super cool". "Look, the thing is" stays. Never formalize casual language.
- **Remove the peak tags** — they were structural scaffolding, not part of the output

### Step 4: Apply Constraints

Check every sentence against:
- **Editor-not-writer rule**: did you add any idea the speaker didn't express? Remove it.
- **Voice profile match**: does this sentence sound like the speaker? If not, rewrite using their vocabulary and rhythm.
- **Anti-slop check**: scan for every phrase in the anti-slop list. Replace any that slipped in with the speaker's natural language, or cut the sentence.
- **Formality check**: did you accidentally upgrade the register? ("super cool" → "particularly noteworthy" is a violation)

### Step 5: Format as Blog Post

Write with Astro frontmatter:

```markdown
---
title: '[short, direct title from the content — not clickbait]'
description: '[one sentence capturing the core idea — used in previews/RSS]'
pubDate: '[today''s date in format: Mon DD YYYY]'
---

[blog post content]
```

### Step 6: Write Output

Write the blog draft to `tmp-{article}/draft.md` (same `tmp-{article}/` folder as the input `clean.md`).

Do **not** write to `src/content/blog/` — the user will move the draft there when they're happy with it.

## Output

Show the user the full blog post. Report:
- Number of peak moments amplified
- Any sections that were significantly restructured (and why)
- Word count of final post
