import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAdminSession } from "@/lib/security";
import { logAudit } from "@/lib/logging";

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  return token ? verifyAdminSession(token) : null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: licenseId } = await context.params;
  const { action, days, status } = await req.json();

  const license = await prisma.license.findUnique({ where: { id: licenseId } });
  if (!license) return NextResponse.json({ error: "License not found" }, { status: 404 });

  if (action === "toggle-status") {
    const newStatus = status || (license.status === "ACTIVE" ? "DISABLED" : "ACTIVE");
    const updated = await prisma.license.update({
      where: { id: licenseId },
      data: { status: newStatus },
    });
    await logAudit({
      adminId: session.adminId,
      action: "TOGGLE_LICENSE_STATUS",
      targetType: "License",
      targetId: licenseId,
      details: { newStatus },
    });
    return NextResponse.json({ success: true, license: updated });
  }

  if (action === "revoke") {
    const updated = await prisma.license.update({
      where: { id: licenseId },
      data: { status: "REVOKED" },
    });
    await logAudit({
      adminId: session.adminId,
      action: "REVOKE_LICENSE",
      targetType: "License",
      targetId: licenseId,
    });
    return NextResponse.json({ success: true, license: updated });
  }

  if (action === "extend") {
    const extensionDays = Number(days) || 30;
    const currentExpiry = license.expiresAt ? new Date(license.expiresAt) : new Date();
    const newExpiry = new Date(currentExpiry.setDate(currentExpiry.getDate() + extensionDays));
    const updated = await prisma.license.update({
      where: { id: licenseId },
      data: { expiresAt: newExpiry, status: "ACTIVE" },
    });
    await logAudit({
      adminId: session.adminId,
      action: "EXTEND_LICENSE",
      targetType: "License",
      targetId: licenseId,
      details: { extensionDays, newExpiry },
    });
    return NextResponse.json({ success: true, license: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
