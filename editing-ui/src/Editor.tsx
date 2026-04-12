import { useEffect, useRef, useCallback, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block } from "@blocknote/core";
import { AIEditPanel } from "./AIEditPanel";
import { CritiqueExtension } from "./critiqueExtension";
import { CritiquePopover, type CritiqueIssue } from "./CritiquePopover";
import { findTextPosition } from "./findTextPosition";

interface EditorProps {
  initialMarkdown: string;
  onSave: (markdown: string) => void;
  onCritiqueStateChange?: (state: {
    critiquing: boolean;
    hasIssues: boolean;
    status: string;
  }) => void;
}

export function Editor({ initialMarkdown, onSave, onCritiqueStateChange }: EditorProps) {
  const initialized = useRef(false);

  const editor = useCreateBlockNote({
    extensions: [CritiqueExtension],
  });

  // AI edit state
  const [aiPanelVisible, setAiPanelVisible] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [editResult, setEditResult] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  // Store full document snapshot for bulletproof reject
  const documentSnapshotRef = useRef<Block[]>([]);
  const selectedBlockIdsRef = useRef<string[]>([]);

  // Critique state
  const [critiquing, setCritiquing] = useState(false);
  const [critiqueIssues, setCritiqueIssues] = useState<CritiqueIssue[]>([]);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  // Load markdown into editor on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
      editor.replaceBlocks(editor.document, blocks);
    })();
  }, [editor, initialMarkdown]);

  // Cmd+J shortcut to trigger AI edit
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        triggerAIEdit();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  // Click detection for critique highlights
  useEffect(() => {
    const dom = editor.domElement;
    if (!dom || critiqueIssues.length === 0) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const highlight = target.closest(".critique-highlight") as HTMLElement | null;
      if (highlight) {
        const commentId = highlight.getAttribute("data-comment-id");
        if (commentId) {
          const rect = highlight.getBoundingClientRect();
          setSelectedCommentId(commentId);
          setPopoverAnchor({ x: rect.right, y: rect.top });
          return;
        }
      }
    }

    dom.addEventListener("click", handleClick);
    return () => dom.removeEventListener("click", handleClick);
  }, [editor, critiqueIssues]);

  function triggerAIEdit() {
    const selection = editor.getSelection();
    if (!selection || selection.blocks.length === 0) return;

    // Snapshot the entire document for reject
    documentSnapshotRef.current = JSON.parse(JSON.stringify(editor.document));
    selectedBlockIdsRef.current = selection.blocks.map((b) => b.id);

    setAiPanelVisible(true);
    setStreaming(false);
    setStreamedText("");
    setHasResult(false);
    setEditResult("");
    setOriginalText("");
    setEditError(null);
  }

  async function handleSubmit(instruction: string) {
    const blockIds = selectedBlockIdsRef.current;
    if (blockIds.length === 0) return;

    // Get selected blocks and convert to markdown
    const selectedBlocks = blockIds
      .map((id) => editor.getBlock(id))
      .filter(Boolean);
    const selectedMarkdown = await editor.blocksToMarkdownLossy(selectedBlocks as any);
    setOriginalText(selectedMarkdown);

    setStreaming(true);
    setStreamedText("");

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_text: selectedMarkdown,
          instruction,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setStreaming(false);
        setEditError(data.error || `Edit failed: ${res.status}`);
        return;
      }

      const fullResult = (data.result || "").trim();

      if (!fullResult || fullResult.length < selectedMarkdown.length * 0.1) {
        setStreaming(false);
        setEditError("Edit returned empty or too short. Try a more specific instruction.");
        return;
      }

      setStreamedText(fullResult);
      setEditResult(fullResult);
      setStreaming(false);
      setHasResult(true);
      // Don't replace blocks yet — wait for Accept
    } catch (err: any) {
      console.error("Edit failed:", err);
      setStreaming(false);
      setEditError(`Edit failed: ${err.message}`);
    }
  }

  async function handleAccept() {
    // Now replace the selected blocks with the edit
    const blockIds = selectedBlockIdsRef.current;
    if (blockIds.length > 0 && editResult) {
      try {
        const newBlocks = await editor.tryParseMarkdownToBlocks(editResult);
        editor.replaceBlocks(blockIds, newBlocks);
      } catch (err) {
        console.error("Replace failed, applying via full document rebuild:", err);
        // Fallback: rebuild entire document with the edit applied
        const fullMd = await editor.blocksToMarkdownLossy(editor.document);
        const originalText = await editor.blocksToMarkdownLossy(
          blockIds.map((id) => editor.getBlock(id)).filter(Boolean) as any
        );
        const newMd = fullMd.replace(originalText, editResult);
        const newDoc = await editor.tryParseMarkdownToBlocks(newMd);
        editor.replaceBlocks(editor.document, newDoc);
      }
    }
    setAiPanelVisible(false);
    resetAIState();
  }

  function handleReject() {
    // Original text is untouched — just close
    setAiPanelVisible(false);
    resetAIState();
  }

  function handleClose() {
    if (streaming) return;
    if (hasResult) {
      handleReject();
      return;
    }
    setAiPanelVisible(false);
    resetAIState();
  }

  function resetAIState() {
    setStreaming(false);
    setStreamedText("");
    setHasResult(false);
    setEditResult("");
    setOriginalText("");
    setEditError(null);
    documentSnapshotRef.current = [];
    selectedBlockIdsRef.current = [];
  }

  // --- Critique handlers ---

  function updateCritiqueStatus(status: string, critiquing: boolean, hasIssues: boolean) {
    setCritiquing(critiquing);
    onCritiqueStateChange?.({ critiquing, hasIssues, status });
  }

  async function handleCritique() {
    console.log("[critique] Starting critique...");
    updateCritiqueStatus("Critic is analyzing your article...", true, false);

    try {
      console.log("[critique] Converting to markdown...");
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      console.log("[critique] Markdown length:", markdown.length, "— sending to server...");

      // The fetch is the long wait — status is already set above
      const res = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("[critique] Error:", data.error);
        updateCritiqueStatus("", false, false);
        return;
      }

      updateCritiqueStatus("Highlighting issues...", true, false);

      const issues: CritiqueIssue[] = data.issues || [];
      const tiptap = (editor as any)._tiptapEditor;
      const doc = tiptap.state.doc;

      // Save current cursor position
      const savedSelection = tiptap.state.selection;

      // Apply marks for each issue that has a matching quote
      let matched = 0;
      for (const issue of issues) {
        const pos = findTextPosition(doc, issue.location);
        if (pos) {
          tiptap
            .chain()
            .setTextSelection({ from: pos.from, to: pos.to })
            .setMark("critiqueHighlight", {
              commentId: issue.id,
              priority: issue.priority,
            })
            .run();
          matched++;
        }
      }

      // Restore cursor position
      tiptap.chain().setTextSelection(savedSelection).run();

      console.log(`[critique] ${matched}/${issues.length} issues anchored to text`);

      setCritiqueIssues(issues);
      updateCritiqueStatus(`${issues.length} issues found`, false, issues.length > 0);
    } catch (err: any) {
      console.error("[critique] Failed with error:", err.message, err);
      updateCritiqueStatus("", false, false);
    }
  }

  function handleClearCritique() {
    const tiptap = (editor as any)._tiptapEditor;
    const { doc } = tiptap.state;
    const markType = tiptap.schema.marks.critiqueHighlight;

    if (markType) {
      tiptap
        .chain()
        .setTextSelection({ from: 0, to: doc.content.size })
        .unsetMark("critiqueHighlight")
        .run();
      // Collapse selection to start so the full doc isn't selected
      tiptap.chain().setTextSelection(0).run();
    }

    setCritiqueIssues([]);
    setSelectedCommentId(null);
    setPopoverAnchor(null);
    updateCritiqueStatus("", false, false);
  }

  // --- Apply suggestion from critique ---

  function handleApplySuggestion(issue: CritiqueIssue) {
    const tiptap = (editor as any)._tiptapEditor;
    const pos = findTextPosition(tiptap.state.doc, issue.location);
    if (!pos) {
      console.warn("[apply] Could not find quote in document");
      return;
    }

    // Move cursor to the highlighted text so we can find the containing block
    tiptap.chain().setTextSelection(pos.from).run();
    const cursorPos = editor.getTextCursorPosition();
    const block = cursorPos.block;

    // Snapshot the entire document for reject
    documentSnapshotRef.current = JSON.parse(JSON.stringify(editor.document));
    selectedBlockIdsRef.current = [block.id];

    // Build instruction from the critic's feedback
    const instruction = `Fix this issue: ${issue.problem}\n\nDirection: ${issue.direction}`;

    // Close popover, open AI edit panel
    setSelectedCommentId(null);
    setPopoverAnchor(null);
    setAiPanelVisible(true);
    setStreaming(false);
    setStreamedText("");
    setHasResult(false);
    setEditResult("");
    setOriginalText("");
    setEditError(null);

    // Auto-submit the edit
    handleSubmit(instruction);
  }

  // Save handler
  const handleSave = useCallback(async () => {
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    onSave(markdown);
  }, [editor, onSave]);

  const selectedIssue = critiqueIssues.find((i) => i.id === selectedCommentId) || null;

  return (
    <>
      <button data-save onClick={handleSave} style={{ display: "none" }} />
      <button data-critique onClick={handleCritique} style={{ display: "none" }} />
      <button data-clear-critique onClick={handleClearCritique} style={{ display: "none" }} />
      <div className="editor-container">
        <BlockNoteView editor={editor} theme="light" />
      </div>
      <CritiquePopover
        issue={selectedIssue}
        anchor={popoverAnchor}
        onClose={() => {
          setSelectedCommentId(null);
          setPopoverAnchor(null);
        }}
        onApply={handleApplySuggestion}
      />
      <AIEditPanel
        visible={aiPanelVisible}
        streaming={streaming}
        streamedText={streamedText}
        hasResult={hasResult}
        originalText={originalText}
        editedText={editResult}
        error={editError}
        onSubmit={handleSubmit}
        onAccept={handleAccept}
        onReject={handleReject}
        onClose={handleClose}
      />
    </>
  );
}
