import { Mark, mergeAttributes } from "@tiptap/core";
import { createExtension } from "@blocknote/core";

/**
 * TipTap Mark for critique highlights.
 * Modeled on BlockNote's own CommentMark (@blocknote/core/src/comments/mark.ts).
 */
const CritiqueHighlightMark = Mark.create({
  name: "critiqueHighlight",
  excludes: "",
  inclusive: false,
  keepOnSplit: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs: Record<string, any>) => ({
          "data-comment-id": attrs.commentId,
        }),
      },
      priority: {
        default: "medium",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-priority"),
        renderHTML: (attrs: Record<string, any>) => ({
          "data-priority": attrs.priority,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "critique-highlight" }),
      0,
    ];
  },

  parseHTML() {
    return [{ tag: "span.critique-highlight" }];
  },

  extendMarkSchema(extension) {
    if (extension.name === "critiqueHighlight") {
      return { blocknoteIgnore: true };
    }
    return {};
  },
});

export const CritiqueExtension = createExtension({
  key: "critiqueHighlight",
  tiptapExtensions: [CritiqueHighlightMark],
});
