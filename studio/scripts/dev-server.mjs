#!/usr/bin/env node
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const stateDir = join(root, ".algophony-studio");
const pidFile = join(stateDir, "dev-server.pid");
const logFile = join(root, "dev_server.log");
const host = process.env.ALGOPHONY_STUDIO_DEV_HOST || "127.0.0.1";
const port = process.env.ALGOPHONY_STUDIO_DEV_PORT || "3001";

function readPid() {
  if (!existsSync(pidFile)) return null;
  const value = Number.parseInt(readFileSync(pidFile, "utf8").trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function signalPid(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function isRunning(pid) {
  if (!pid) return false;
  return signalPid(pid, 0) || signalPid(-pid, 0);
}

function start() {
  mkdirSync(stateDir, { recursive: true });
  const existingPid = readPid();
  if (isRunning(existingPid)) {
    console.log(`Algophony Studio dev server is already running on pid ${existingPid}.`);
    console.log(`Open http://localhost:${port} or http://127.0.0.1:${port}`);
    return;
  }

  const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(nextBin)) {
    throw new Error("Next.js is not installed. Run npm install in studio/ first.");
  }

  const logFd = openSync(logFile, "a");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--webpack", "--hostname", host, "--port", port],
    {
      cwd: root,
      detached: true,
      env: {
        ...process.env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=4096"].filter(Boolean).join(" "),
      },
      stdio: ["ignore", logFd, logFd],
    },
  );

  writeFileSync(pidFile, `${child.pid}\n`, "utf8");
  child.unref();
  console.log(`Started Algophony Studio dev server on pid ${child.pid}.`);
  console.log(`Open http://localhost:${port} or http://127.0.0.1:${port}`);
  console.log(`Logs: ${logFile}`);
}

function stop() {
  const pid = readPid();
  if (!isRunning(pid)) {
    console.log("Algophony Studio dev server is not running.");
    return;
  }
  if (!signalPid(-pid, "SIGTERM")) {
    signalPid(pid, "SIGTERM");
  }
  console.log(`Stopped Algophony Studio dev server pid ${pid}.`);
}

const command = process.argv[2] || "start";
if (command === "start") {
  start();
} else if (command === "stop") {
  stop();
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: node scripts/dev-server.mjs [start|stop]");
  process.exitCode = 2;
}
