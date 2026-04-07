---
name: edit
description: Launches a visual editing UI for a polished article. Opens a BlockNote editor in the browser where you can make manual edits and AI-assisted edits (select text + describe changes). Use after the polish/refine pipeline. Triggers on "edit", "edit this draft", or "open editor".
argument-hint: <markdown-file-path>
allowed-tools: Bash
---

# Visual Article Editor

Launch a browser-based editing UI for post-pipeline article refinement. Supports both manual editing and AI-assisted edits with voice profile enforcement.

## Usage

```
/verbatim:edit tmp-article/draft.md
```

## Workflow

1. Validate the file path argument exists
2. Build the frontend if needed (`bun run build` in the `editing-ui/` directory)
3. Start the Bun server with the file path
4. Open the browser to the editor URL
5. Tell the user the editor is running and how to use it

## Instructions

Given a file path argument, run the following steps:

### Step 1: Validate

Check that the file argument was provided and the file exists. If not, print usage instructions and stop.

### Step 2: Build

Run `bun run build` in the `editing-ui/` directory at the plugin root. This bundles the React app. Skip if `editing-ui/public/dist/index.js` already exists and is newer than source files.

### Step 3: Launch

Start the server and open the browser:

```bash
cd <plugin-root>/editing-ui && bun run server.ts <file-path> &
```

Wait for the server to print its URL, then open it with `open <url>`.

### Step 4: Inform the user

Tell them:
- The editor is open in their browser
- **Cmd+J** to trigger an AI edit (select text first)
- Click **Save** when done to write changes back to disk
- **Ctrl+C** in the terminal to stop the server when finished

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+J | Open AI edit panel (with text selected) |
| Escape | Close the edit panel |
| Enter | Submit edit instruction |
