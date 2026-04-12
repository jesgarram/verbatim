import type { Node as ProseMirrorNode } from "prosemirror-model";

interface TextPosition {
  from: number;
  to: number;
}

/**
 * Find the ProseMirror {from, to} position of a quoted text string
 * within the document. Handles text that spans across inline formatting
 * boundaries (bold, italic, etc.) by building a flat text→position map.
 */
export function findTextPosition(
  doc: ProseMirrorNode,
  quote: string
): TextPosition | null {
  // Build flat text and parallel position array
  const positions: number[] = [];
  let flatText = "";

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        positions.push(pos + i);
        flatText += node.text[i];
      }
    }
  });

  // Exact match first
  let index = flatText.indexOf(quote);

  // Fallback: normalize whitespace and retry
  if (index === -1) {
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    const normalizedFlat = normalize(flatText);
    const normalizedQuote = normalize(quote);
    const normalizedIndex = normalizedFlat.indexOf(normalizedQuote);

    if (normalizedIndex !== -1) {
      // Map normalized index back to original positions.
      // Walk the original flat text, counting non-collapsed characters.
      let normCount = 0;
      let origStart = -1;
      let origEnd = -1;
      let inWhitespace = false;
      // Skip leading whitespace in the original to match normalize().trim()
      let started = false;

      for (let i = 0; i < flatText.length; i++) {
        const ch = flatText[i];
        const isWs = /\s/.test(ch);

        if (!started) {
          if (isWs) continue;
          started = true;
        }

        if (isWs) {
          if (!inWhitespace) {
            // First whitespace char in a run → counts as one space
            if (normCount === normalizedIndex) origStart = i;
            normCount++;
            if (normCount === normalizedIndex + normalizedQuote.length) {
              origEnd = i + 1;
              break;
            }
            inWhitespace = true;
          }
          // Subsequent whitespace chars in a run → skip
        } else {
          if (normCount === normalizedIndex) origStart = i;
          normCount++;
          if (normCount === normalizedIndex + normalizedQuote.length) {
            origEnd = i + 1;
            break;
          }
          inWhitespace = false;
        }
      }

      if (origStart !== -1 && origEnd !== -1) {
        return {
          from: positions[origStart],
          to: positions[origEnd - 1] + 1,
        };
      }
    }

    console.warn(`[critique] Quote not found in document: "${quote.slice(0, 80)}..."`);
    return null;
  }

  return {
    from: positions[index],
    to: positions[index + quote.length - 1] + 1,
  };
}
