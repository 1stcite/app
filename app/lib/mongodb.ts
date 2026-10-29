import { MongoClient, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Missing MONGODB_URI");

const options: MongoClientOptions = {
  maxPoolSize: 5,
  // Cold starts on Vercel can take more than 5 s to reach the cluster
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 20000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Start a connection and cache it for reuse across requests. If the attempt
 * fails, the cache is cleared (so the next request tries again instead of
 * reusing a dead promise) and the rejection is handled (so a failed connect
 * can't crash the server process with an unhandled rejection).
 */
function connect(): Promise<MongoClient> {
  const p = new MongoClient(uri, options).connect();
  global._mongoClientPromise = p;
  p.catch((e) => {
    if (global._mongoClientPromise === p) global._mongoClientPromise = undefined;
    console.error("MongoDB connect failed:", e?.message ?? e);
  });
  return p;
}

/** Shared client; on a failed connect, retries once with a fresh client. */
export async function getClient(): Promise<MongoClient> {
  try {
    return await (global._mongoClientPromise ?? connect());
  } catch {
    return await connect();
  }
}
