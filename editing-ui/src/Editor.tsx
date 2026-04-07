import { useEffect, useRef, useCallback, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block } from "@blocknote/core";
import { AIEditPanel } from "./AIEditPanel";

interface EditorProps {
  initialMarkdown: string;
  onSave: (markdown: string) => void;
}

export function Editor({ initialMarkdown, onSave }: EditorProps) {
  const initialized = useRef(false);

  const editor = useCreateBlockNote();

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

  // Save handler
  const handleSave = useCallback(async () => {
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    onSave(markdown);
  }, [editor, onSave]);

  return (
    <>
      <button data-save onClick={handleSave} style={{ display: "none" }} />
      <div className="editor-container">
        <BlockNoteView editor={editor} theme="light" />
      </div>
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
