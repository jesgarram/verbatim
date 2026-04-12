import { useEffect, useRef } from "react";

export interface CritiqueIssue {
  id: string;
  priority: "high" | "medium" | "low";
  location: string;
  principle: string;
  problem: string;
  readerImpact: string;
  direction: string;
}

interface CritiquePopoverProps {
  issue: CritiqueIssue | null;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  onApply: (issue: CritiqueIssue) => void;
}

const priorityLabels: Record<string, { label: string; className: string }> = {
  high: { label: "HIGH", className: "critique-badge-high" },
  medium: { label: "MED", className: "critique-badge-medium" },
  low: { label: "LOW", className: "critique-badge-low" },
};

export function CritiquePopover({ issue, anchor, onClose, onApply }: CritiquePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Don't close if clicking another highlight (let the click handler switch)
        const target = e.target as HTMLElement;
        if (target.closest(".critique-highlight")) return;
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    // Use timeout to avoid the opening click immediately closing the popover
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timer);
    };
  }, [onClose]);

  if (!issue || !anchor) return null;

  // Position to the right of the editor container
  const editorEl = document.querySelector(".editor-container");
  const editorRect = editorEl?.getBoundingClientRect();
  const left = editorRect ? editorRect.right + 12 : anchor.x + 12;
  const top = anchor.y;

  const badge = priorityLabels[issue.priority] || priorityLabels.medium;

  return (
    <div
      ref={popoverRef}
      className="critique-popover"
      style={{ left, top }}
    >
      <div className="critique-popover-header">
        <span className={`critique-badge ${badge.className}`}>{badge.label}</span>
        <span className="critique-principle">{issue.principle}</span>
      </div>
      <div className="critique-popover-body">
        <div className="critique-section">
          <div className="critique-label">Problem</div>
          <div className="critique-text">{issue.problem}</div>
        </div>
        <div className="critique-section">
          <div className="critique-label">Reader impact</div>
          <div className="critique-text">{issue.readerImpact}</div>
        </div>
        <div className="critique-section">
          <div className="critique-label">Direction</div>
          <div className="critique-text">{issue.direction}</div>
        </div>
      </div>
      <div className="critique-popover-footer">
        <button
          className="critique-apply-btn"
          onClick={() => onApply(issue)}
        >
          Apply suggestion
        </button>
      </div>
    </div>
  );
}
