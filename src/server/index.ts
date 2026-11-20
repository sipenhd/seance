import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGateway } from "./gateway.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const demo = process.env.SEANCE_DEMO === "1";
const clientDir = path.resolve(__dirname, "../client");
const logDir = path.resolve(process.cwd(), "data", "logs");

const { listen } = createGateway({ port, demo, clientDir, logDir });
await listen();
console.log(`Séance listening on http://localhost:${port}${demo ? " (demo mode)" : ""}`);
