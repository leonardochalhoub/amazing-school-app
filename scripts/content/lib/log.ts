import fs from "node:fs";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(event: string, meta?: Record<string, unknown>): void;
  info(event: string, meta?: Record<string, unknown>): void;
  warn(event: string, meta?: Record<string, unknown>): void;
  error(event: string, meta?: Record<string, unknown>): void;
}

export function createLogger(runId: string, dir: string): Logger {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${runId}.log`);
  const stream = fs.createWriteStream(file, { flags: "a" });

  function write(level: LogLevel, event: string, meta?: Record<string, unknown>) {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      runId,
      event,
      ...(meta ?? {}),
    });
    stream.write(line + "\n");
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    debug: (e, m) => write("debug", e, m),
    info: (e, m) => write("info", e, m),
    warn: (e, m) => write("warn", e, m),
    error: (e, m) => write("error", e, m),
  };
}
