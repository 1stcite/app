import { getDb } from "@/app/lib/db";
import { getRequestConference } from "@/app/lib/guards";

/**
 * Whether this request's conference requires attendees to sign in.
 * A conference-level `requireLogin` wins; otherwise the global demo setting
 * applies. Single source of truth: all routes and middleware use this.
 */
export async function getRequireLogin(): Promise<boolean> {
  const conf = await getRequestConference().catch(() => null);
  if (typeof conf?.requireLogin === "boolean") return conf.requireLogin;

  const db = await getDb();
  const cfg = await db
    .collection<{ key: string; requireLogin?: boolean }>("config")
    .findOne({ key: "demo" });
  return Boolean(cfg?.requireLogin);
}
