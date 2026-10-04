import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { UserRole, UserSession } from "@/modules/auth";

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  RECEPTION: [
    "folio:view", "folio:manage", "payments:authorize", "payments:capture",
    "reservations:view", "reservations:manage", "guests:view"
  ],
  MANAGER: [
    "folio:view", "folio:manage", "payments:manage", "revenue:view",
    "rates:manage", "inventory:manage", "inventory:overbooking:manage", "audit:view"
  ],
  OPERATIONS: [
    "housekeeping:view", "housekeeping:manage", "maintenance:view", "valet:manage"
  ],
  COMPLIANCE: [
    "night-audit:view", "night-audit:manage", "audit:view", "reports:view"
  ],
  ADMIN: [
    "*"
  ],
  GUEST: [
    "guest:stay:view", "guest:services:order", "guest:folio:view"
  ],
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role = "RECEPTION", propertyId = "prop_boutique_01" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email es requerido para iniciar sesión" },
        { status: 400 }
      );
    }

    const assignedRole = (role in ROLE_PERMISSIONS ? role : "RECEPTION") as UserRole;
    const permissions = ROLE_PERMISSIONS[assignedRole] || [];
    const token = `jwt_session_${Date.now()}_${assignedRole.toLowerCase()}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours

    const session: UserSession = {
      userId: `usr_${assignedRole.toLowerCase()}_${Date.now()}`,
      email,
      name: email.split("@")[0] || "Staff Member",
      role: assignedRole,
      propertyId,
      permissions,
      token,
      expiresAt,
    };

    const cookieStore = await cookies();
    cookieStore.set("pms_session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "Error al procesar autenticación" },
      { status: 500 }
    );
  }
}
