import "server-only";

import { headers } from "next/headers";
import {
  writeLog,
  type LogFields,
  type LogLevel,
} from "@/lib/observability/logger";

export async function logServer(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
): Promise<void> {
  const headerList = await headers();
  writeLog({
    level,
    event,
    requestId: headerList.get("x-request-id") ?? undefined,
    ...fields,
  });
}
