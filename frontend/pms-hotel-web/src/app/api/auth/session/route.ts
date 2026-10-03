import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { UserSession } from "@/modules/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("pms_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ session: null }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value) as UserSession;

    // Check expiration
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      cookieStore.delete("pms_session");
      return NextResponse.json({ session: null, error: "Sesión expirada" }, { status: 401 });
    }

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ session: null }, { status: 401 });
  }
}
