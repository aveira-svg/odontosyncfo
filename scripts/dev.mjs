import { spawn } from "node:child_process";

process.env.WATCHPACK_POLLING = "true";
process.env.CHOKIDAR_USEPOLLING = "true";

const port = process.env.PORT || "3001";

const child = spawn(
  "npx",
  ["next", "dev", "-H", "127.0.0.1", "-p", port],
  { stdio: "inherit", env: process.env, shell: true }
);

child.on("exit", (code) => process.exit(code ?? 0));
