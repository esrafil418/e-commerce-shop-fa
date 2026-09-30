import "server-only";

import { err, ok, type Result } from "@/types/result";
import { authCopy } from "@/features/auth/messages";
import type { Actor } from "@/features/auth/permissions";
import { getCurrentActor } from "./current-user";

export async function readSessionActor(): Promise<Actor | null> {
  return getCurrentActor();
}

export async function requireSessionActor(): Promise<Result<Actor>> {
  const actor = await getCurrentActor();
  if (!actor) {
    return err("unauthenticated", authCopy.unauthenticated);
  }
  return ok(actor);
}
