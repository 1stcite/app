import { getClient } from "@/app/lib/mongodb";
import type { Db } from "mongodb";

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db("dc");
}
