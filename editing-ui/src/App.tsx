import { useState, useEffect, useRef } from "react";
import { Editor } from "./Editor";

export function App() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [critiquing, setCritiquing] = useState(false);
  const [critiqueStatus, setCritiqueStatus] = useState("");
  const [hasCritique, setHasCritique] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/article")
      .then((res) => res.text())
      .then(setMarkdown)
      .catch((err) => setError(`Failed to load article: ${err.message}`));
  }, []);

  // Elapsed time counter while critiquing
  useEffect(() => {
    if (critiquing) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [critiquing]);

  async function handleSave(content: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        body: content,
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleCritiqueStateChange(state: {
    critiquing: boolean;
    hasIssues: boolean;
    status: string;
  }) {
    setCritiquing(state.critiquing);
    setHasCritique(state.hasIssues);
    setCritiqueStatus(state.status);
  }

  if (error) return <div className="error">{error}</div>;
  if (markdown === null) return <div className="loading">Loading article...</div>;

  return (
    <div className={`app${hasCritique ? " has-critique" : ""}`}>
      <header className="toolbar">
        <h1>verbatim</h1>
        <div className="toolbar-actions">
          {critiquing && (
            <div className="critique-status">
              <span className="critique-status-dot" />
              <span>{critiqueStatus}</span>
              <span className="critique-status-time">{elapsed}s</span>
            </div>
          )}
          {hasCritique && (
            <button
              onClick={() => {
                const el = document.querySelector("[data-clear-critique]") as HTMLElement;
                el?.click();
              }}
              className="clear-critique-btn"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => {
              const el = document.querySelector("[data-critique]") as HTMLElement;
              el?.click();
            }}
            disabled={saving || critiquing}
          >
            {critiquing ? "Critique" : "Critique"}
          </button>
          <button
            onClick={() => {
              const el = document.querySelector("[data-save]") as HTMLElement;
              el?.click();
            }}
            disabled={saving || critiquing}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>
      <Editor
        initialMarkdown={markdown}
        onSave={handleSave}
        onCritiqueStateChange={handleCritiqueStateChange}
      />
    </div>
  );
}
