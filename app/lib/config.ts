import { getDb } from "@/app/lib/db";

/**
 * Returns the current requireLogin setting from the config collection.
 * Single source of truth — all routes and middleware use this.
 */
export async function getRequireLogin(): Promise<boolean> {
  const db = await getDb();
  const cfg = await db
    .collection<{ key: string; requireLogin?: boolean }>("config")
    .findOne({ key: "demo" });
  return Boolean(cfg?.requireLogin);
}
