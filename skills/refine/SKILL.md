---
name: refine
description: Adversarial refinement using Critic (Red Team) and Editor (Blue Team) sub-agents to improve a polished draft while preserving the speaker's voice. Replaces the audit step. Triggers on "refine", "refine this draft", "red team this", or "adversarial review".
argument-hint: <polished-draft-path>
---

# Adversarial Refinement

Improve a polished draft through a Critic/Editor loop. The Critic (Red Team) finds problems a reader would notice. The Editor (Blue Team) fixes them while guarding the speaker's voice. This is the final quality step before the draft is ready to publish.

## Input

Read the polished draft from: $ARGUMENTS

If no arguments provided, ask the user for a file path.

Also read these files before starting the loop:
- Voice profile: `voice-profile.md` at the project root
- Anti-slop list: `${CLAUDE_PLUGIN_ROOT}/skills/polish/references/anti-slop.md`
- Critic prompt template: `${CLAUDE_SKILL_DIR}/references/critic-prompt.md`
- Editor prompt template: `${CLAUDE_SKILL_DIR}/references/editor-prompt.md`
- Refinement principles: `${CLAUDE_SKILL_DIR}/references/refinement-principles.md`

If the voice profile doesn't exist, warn the user that refinement works better with one and proceed using the defaults in `${CLAUDE_PLUGIN_ROOT}/skills/polish/references/voice-constraints.md`.

## Process

Run up to 2 rounds of Critic then Editor. Each round works as follows:

### Step 1: Spawn the Critic (Red Team)

Launch a sub-agent using the Agent tool. Build the prompt from the critic template in `${CLAUDE_SKILL_DIR}/references/critic-prompt.md`, inserting:

- The current draft into the `{draft_content}` placeholder
- The refinement principles into the `{refinement_principles}` placeholder
- The round number (1 or 2) into the `{round_number}` placeholder

### Step 2: Check the Verdict

Read the Critic's response. Look for the `<verdict>` tag.

- If `DONE`: the draft is ready. Skip the Editor and go to Output.
- If `REFINE`: proceed to Step 3.
- If the Critic found only low-priority issues: treat as `DONE`. Minor tweaks risk over-editing.

### Step 3: Spawn the Editor (Blue Team)

Launch a sub-agent using the Agent tool. Build the prompt from the editor template in `${CLAUDE_SKILL_DIR}/references/editor-prompt.md`, inserting:

- The current draft into the `{draft_content}` placeholder
- The Critic's full feedback into the `{critic_feedback}` placeholder
- The voice profile content into the `{voice_profile}` placeholder
- The anti-slop list content into the `{anti_slop_list}` placeholder

### Step 4: Update the Draft

Extract the revised draft from the Editor's response (Section 1). This becomes the working draft. Save the changelog (Section 2) for the refinement log.

If this was round 1: return to Step 1 for round 2, using the revised draft as input.
If this was round 2: proceed to Output.

## Output

Write the refined draft to `tmp-{article}/draft.md`, overwriting the polish step's output.

Write the refinement log to `tmp-{article}/refine-log.md` with this format:

```markdown
# Refinement Log

**Draft**: [filename]
**Rounds**: [number of rounds run]
**Final verdict**: [DONE or stopped after max rounds]

## Round 1

### Critic Feedback
[summary of issues found, with priorities]

### Editor Changes
[changelog from the editor — what was accepted, rejected, and why]

## Round 2 (if run)

### Critic Feedback
[summary]

### Editor Changes
[changelog]
```

Show the user:
1. The **full refined blog post**
2. A **brief summary** of what changed across all rounds (3-5 bullet points)
3. Any **feedback the editor rejected** with the reason — so the user can override if they disagree
4. Ask: **"Does this sound like you? Anything you'd change?"**

## Notes

- The Critic and Editor are adversarial by design. The Critic pushes for quality. The Editor pushes back to protect voice. The tension between them is the point.
- If the Critic returns DONE on round 1, that's a good sign — the polish step did its job well. Report this to the user.
- The Editor can reject Critic feedback. This is expected and healthy. Always show rejections to the user so they have the final say.
- This step overwrites `draft.md` intentionally. The polish output has served its purpose. If the user wants to compare, they can use git diff or check the refine log.
