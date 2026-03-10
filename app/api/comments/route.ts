// app/api/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/app/lib/auth";

const allowedVisibility = new Set(["public", "question", "note"]);

async function getRequireLogin(): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db();

  const cfg = await db
    .collection<{ _id: string; requireLogin?: boolean }>("config")
    .findOne({ _id: "app" });

  return Boolean(cfg?.requireLogin);
}

export async function GET(req: NextRequest) {
  try {
    const posterId = req.nextUrl.searchParams.get("posterId");
    if (!posterId) {
      return NextResponse.json({ error: "posterId is required" }, { status: 400 });
    }

    const requireLogin = await getRequireLogin();
    const user = await getSessionUser().catch(() => null);

    if (requireLogin && !user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const sessionUserId = user ? String(user._id) : undefined;

    const poster = await db
      .collection<{ id: string; presenterUserId?: ObjectId | string | null }>("posters")
      .findOne({ id: posterId });

    const presenterUserId = poster?.presenterUserId
      ? String(poster.presenterUserId)
      : undefined;

    const comments = await db
      .collection("comments")
      .find({ posterId })
      .sort({ timestamp: -1 })
      .toArray();

    const visibleComments = comments.filter((comment) => {
      const visibility = comment.visibilityType ?? "public";

      if (visibility === "public") return true;
      if (!sessionUserId) return false;

      const ownerId = String(comment.userId);

      if (visibility === "note") {
        return ownerId === sessionUserId;
      }

      if (visibility === "question") {
        return ownerId === sessionUserId || presenterUserId === sessionUserId;
      }

      return false;
    });

    return NextResponse.json({
      comments: visibleComments,
      sessionUserId,
    });
  } catch (e) {
    console.error("GET /api/comments error:", e);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const requireLogin = await getRequireLogin();
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: requireLogin ? "Login required" : "Login required to comment" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const posterId = String(body?.posterId || "");
    const page = body?.page;
    const text = String(body?.text || "").trim();
    const visibilityType = String(body?.visibilityType || "public");

    if (!allowedVisibility.has(visibilityType)) {
      return NextResponse.json({ error: "Invalid visibilityType" }, { status: 400 });
    }

    if (!posterId || page === undefined || !text) {
      return NextResponse.json(
        { error: "posterId, page, and text are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const comment = {
      posterId,
      page: Number(page),
      text,
      author: user.displayName,
      userId: user._id,
      visibilityType,
      routeMarker: "COMMENTS_POST_V2_TEST",
      timestamp: new Date(),
    };

    const result = await db.collection("comments").insertOne(comment);

    return NextResponse.json({ ...comment, _id: result.insertedId });
  } catch (e) {
    console.error("POST /api/comments error:", e);
    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const requireLogin = await getRequireLogin();
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: requireLogin ? "Login required" : "Login required to delete" },
        { status: 401 }
      );
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Comment id is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("comments").deleteOne({
      _id: new ObjectId(id),
      userId: user._id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Comment not found (or not yours)" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/comments error:", e);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}