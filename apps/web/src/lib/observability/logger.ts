const sensitiveKey =
  /password|token|authorization|cookie|secret|apikey|api_key|guesttoken/i;

export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export type LogEntry = {
  level: LogLevel;
  event: string;
  message?: string;
  requestId?: string;
} & LogFields;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = sensitiveKey.test(key) ? "[redacted]" : redact(nested);
    }
    return output;
  }

  return value;
}

export function formatLog(entry: LogEntry): string {
  return JSON.stringify(redact(entry));
}

export function writeLog(entry: LogEntry): void {
  const line = formatLog(entry);
  if (entry.level === "error") {
    console.error(line);
    return;
  }
  if (entry.level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}
