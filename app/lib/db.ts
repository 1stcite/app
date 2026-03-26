import clientPromise from "@/app/lib/mongodb";
import type { Db } from "mongodb";

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db("dc");
}
