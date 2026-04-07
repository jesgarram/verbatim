import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
