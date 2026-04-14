import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const cookieStore = await cookies();
  const viewMode = cookieStore.get("px_view_mode")?.value === "attendee" ? "attendee" : "admin";

  if (!user) {
    return NextResponse.json({
      signedIn: false,
      isAdmin: false,
      displayName: null,
      viewMode: "attendee",
    });
  }

  return NextResponse.json({
    signedIn: true,
    isAdmin: Boolean(user.isAdmin),
    displayName: user.displayName,
    viewMode: user.isAdmin ? viewMode : "attendee",
  });
}
