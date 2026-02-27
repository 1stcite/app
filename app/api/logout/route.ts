import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Clear cookie
  res.cookies.set({
    name: "px_attendee",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return res;
}