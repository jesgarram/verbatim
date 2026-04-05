---
name: voice-profile
description: Extracts a speaker's voice, tone, vocabulary, and rhythm from transcripts or writing samples. Produces a voice profile that the polish and refine skills use to preserve authentic voice. Triggers on "voice profile", "extract voice", "build voice profile", or "analyze my voice".
argument-hint: <transcript-or-writing-sample-path> [additional-samples...]
---

# Voice Profile Extractor

Analyze transcripts or writing samples to extract the speaker's authentic voice — their tone, vocabulary, rhythm, and structural preferences. This profile becomes the authority that the polish and refine skills use to preserve voice during editing.

## Input

Read the source material from: $ARGUMENTS

Accept one or more files — raw transcripts, published blog posts, or any writing sample. More samples produce a better profile. If no arguments provided, ask the user for file paths.

If a `voice-profile.md` already exists at the project root, read it first — you're updating, not starting from scratch. New samples refine the existing profile.

## Process

### Step 1: Read All Source Material

Read every file provided. For each one, note:
- Is this a transcript (spoken) or written piece?
- How long is it?
- What's the subject matter?

You need at least 1 source to build a profile. 3+ sources produce significantly better profiles because patterns emerge across samples.

### Step 2: Analyze Tone

Listen for how the speaker carries authority and relates to the reader:

- **Authority level**: Do they state things confidently ("This is how it works") or hedge ("I think maybe this could work")? Do they use qualifiers or speak in absolutes?
- **Formality**: Professional but approachable? Fully casual? Academic? Where on the spectrum?
- **Humor style**: Dry? Self-deprecating? Sarcastic? Absent? Does it land in asides or is it structural?
- **Relationship to reader**: Teaching from above? Thinking alongside? Sharing from experience?
- **Emotional register**: Even-keeled? Enthusiastic? Measured? Do they show excitement or stay flat?

Pull 3-5 exact quotes that exemplify the tone. These are your evidence.

### Step 3: Catalog Vocabulary

Build two lists by scanning across all samples:

**Uses frequently** — Words and phrases that recur across samples. These are signature. Look for:
- Intensifiers they reach for ("super", "really", "pretty", "incredibly")
- Transition phrases ("so", "the thing is", "here's the deal", "look")
- Technical terms they use without explaining (signals assumed audience level)
- Colloquialisms and informal language ("gonna", "stuff", "cool", "wild")
- Filler-that-isn't-filler — discourse markers that carry their personality

**Never uses** — Words conspicuously absent across all samples, especially:
- Formal alternatives they could use but don't
- Business/corporate language
- Academic hedging language
- Any words from the anti-slop list that the speaker naturally avoids

Also note **preferred alternatives** — when there's a formal/informal pair, which does the speaker pick? ("use" vs "leverage", "help" vs "empower", "good" vs "optimal")

### Step 4: Map Rhythm Patterns

Analyze sentence-level patterns across samples:

- **Sentence length distribution**: What's typical? Do they mix short punchy with long flowing? Or stay consistently medium?
- **Fragment usage**: Do they use sentence fragments for emphasis? ("Works every time." "Not even close.")
- **Rhetorical questions**: Do they ask the reader questions? How often?
- **List style**: Do they enumerate in prose ("first... second... third") or avoid lists entirely?
- **Paragraph length**: Typical range in sentences. Do they use single-sentence paragraphs for punch?
- **Repetition patterns**: Do they repeat phrases for emphasis or avoid repetition?

### Step 5: Identify Structural Preferences

Look at how they build arguments and organize ideas:

- **Opening style**: Do they start with a story? A bold claim? A question? A problem statement?
- **Closing style**: Do they summarize? End on a forward-looking note? Drop a final insight? Just stop?
- **Header style**: Short and direct? Questions? Playful? (if samples have headers)
- **Argument flow**: Do they build linearly (A→B→C) or circle back (A→B→A'→C)?
- **Use of examples**: Frequent? Sparse? Do they use analogies or concrete scenarios?
- **Digressions**: Do they go on tangents? Are the tangents part of the charm?

### Step 6: Write the Voice Profile

Write (or overwrite) `voice-profile.md` at the project root.

If updating an existing profile, merge new observations with existing ones. Strengthen patterns that are confirmed by new samples. Note any contradictions — the speaker may have different registers for different contexts.

## Output Format

Write `voice-profile.md` with this structure:

```markdown
# Voice Profile

**Sources analyzed**: [list of files with type: transcript/written]
**Last updated**: [today's date]

## Tone

[2-3 sentences describing overall tone]

- **Authority**: [confident/hedging/mixed — with description]
- **Formality**: [spectrum position — with description]
- **Humor**: [style — with description]
- **Relationship to reader**: [description]

### Tone Examples
> [exact quote 1 — with source file]

> [exact quote 2 — with source file]

> [exact quote 3 — with source file]

## Vocabulary

### Uses Frequently
- [word/phrase] — [context where they use it, with example]
- [word/phrase] — [context, example]
- ...

### Never Uses
- [word/phrase] — [what they say instead]
- [word/phrase] — [alternative]
- ...

### Preferred Alternatives
| Instead of | They say |
|------------|----------|
| [formal]   | [their version] |
| ...        | ...      |

## Rhythm

- **Sentence length**: [description of typical patterns]
- **Fragments**: [yes/no, with examples]
- **Rhetorical questions**: [frequency and style]
- **Paragraph length**: [typical range]
- **Repetition**: [pattern description]

### Rhythm Examples
> [passage that shows their characteristic rhythm — with source]

## Structure

- **Opening style**: [description]
- **Closing style**: [description]
- **Argument flow**: [description]
- **Examples/analogies**: [frequency and style]
- **Digressions**: [description]
```

## Output

Show the user the full voice profile. Then ask:

**"Does this capture how you sound? Anything that's off — or anything I missed?"**

If the user gives feedback, update the profile immediately. Their corrections are the highest-authority signal.

## Notes

- The voice profile is a living document. Run this skill again with new samples to refine it. More data = better profile.
- This skill produces `voice-profile.md` at the project root. The polish and refine skills look for it there automatically.
- A voice profile built from 1 transcript is a rough sketch. From 5+ samples, it's a reliable guide.
- When in doubt about a pattern, note it as tentative: "appears to [pattern] — needs more samples to confirm."
- The profile should describe what the speaker does, not prescribe what they should do. It's descriptive, not normative.
