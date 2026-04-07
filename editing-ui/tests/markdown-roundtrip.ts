import { ServerBlockNoteEditor } from "@blocknote/server-util";
import { readFileSync } from "fs";
import { resolve } from "path";

const inputPath = resolve(import.meta.dir, "sample-draft.md");
const inputMarkdown = readFileSync(inputPath, "utf-8");

const editor = ServerBlockNoteEditor.create();

const blocks = await editor.tryParseMarkdownToBlocks(inputMarkdown);
const outputMarkdown = await editor.blocksToMarkdownLossy(blocks);

console.log("=== INPUT ===");
console.log(inputMarkdown);
console.log("\n=== OUTPUT ===");
console.log(outputMarkdown);
console.log("\n=== DIFF ===");

const inputLines = inputMarkdown.split("\n");
const outputLines = outputMarkdown.split("\n");

let hasDifferences = false;

const maxLines = Math.max(inputLines.length, outputLines.length);
for (let i = 0; i < maxLines; i++) {
  const inLine = inputLines[i] ?? "<missing>";
  const outLine = outputLines[i] ?? "<missing>";
  if (inLine !== outLine) {
    hasDifferences = true;
    console.log(`Line ${i + 1}:`);
    console.log(`  IN:  ${JSON.stringify(inLine)}`);
    console.log(`  OUT: ${JSON.stringify(outLine)}`);
  }
}

if (!hasDifferences) {
  console.log("No differences found! Round-trip is lossless.");
} else {
  console.log("\n=== VERDICT ===");
  console.log("Differences found. Review above to assess if they're cosmetic or content-affecting.");
}
