import DiffMatchPatch from "diff-match-patch";

interface DiffViewProps {
  original: string;
  edited: string;
}

export function DiffView({ original, edited }: DiffViewProps) {
  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(original, edited);
  dmp.diff_cleanupSemantic(diffs);

  return (
    <div className="diff-view">
      {diffs.map(([op, text], i) => {
        if (op === 0) {
          return <span key={i} className="diff-equal">{text}</span>;
        }
        if (op === -1) {
          return <span key={i} className="diff-removed">{text}</span>;
        }
        if (op === 1) {
          return <span key={i} className="diff-added">{text}</span>;
        }
        return null;
      })}
    </div>
  );
}
