import { useState, useRef, useEffect } from "react";
import { DiffView } from "./DiffView";

interface AIEditPanelProps {
  visible: boolean;
  streaming: boolean;
  streamedText: string;
  hasResult: boolean;
  originalText: string;
  editedText: string;
  error: string | null;
  onSubmit: (instruction: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function AIEditPanel({
  visible,
  streaming,
  streamedText,
  hasResult,
  originalText,
  editedText,
  error,
  onSubmit,
  onAccept,
  onReject,
  onClose,
}: AIEditPanelProps) {
  const [instruction, setInstruction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setInstruction("");
    }
  }, [visible]);

  if (!visible) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() || streaming) return;
    onSubmit(instruction.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="ai-edit-panel" onKeyDown={handleKeyDown}>
      {error && (
        <div className="ai-edit-error">
          <span>{error}</span>
          <button type="button" onClick={onClose} className="cancel-btn">
            Dismiss
          </button>
        </div>
      )}

      {!hasResult && !streaming && !error && (
        <form onSubmit={handleSubmit} className="ai-edit-form">
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Describe the edit (e.g., 'make this more conversational')"
            disabled={streaming}
          />
          <button type="submit" disabled={streaming || !instruction.trim()}>
            Edit
          </button>
          <button type="button" onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </form>
      )}

      {streaming && (
        <div className="ai-edit-streaming">
          <div className="streaming-indicator">Editing...</div>
          <div className="streamed-preview">{streamedText}</div>
        </div>
      )}

      {hasResult && (
        <div className="ai-edit-result">
          <div className="diff-container">
            <DiffView original={originalText} edited={editedText} />
          </div>
          <div className="result-actions">
            <button onClick={onAccept} className="accept-btn">
              Accept
            </button>
            <button onClick={onReject} className="reject-btn">
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
