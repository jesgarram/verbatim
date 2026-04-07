import { useState, useEffect } from "react";
import { Editor } from "./Editor";

export function App() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/article")
      .then((res) => res.text())
      .then(setMarkdown)
      .catch((err) => setError(`Failed to load article: ${err.message}`));
  }, []);

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

  if (error) return <div className="error">{error}</div>;
  if (markdown === null) return <div className="loading">Loading article...</div>;

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Verbatim Editor</h1>
        <button onClick={() => {
          const editorEl = document.querySelector("[data-save]") as HTMLElement;
          editorEl?.click();
        }} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </header>
      <Editor initialMarkdown={markdown} onSave={handleSave} />
    </div>
  );
}
