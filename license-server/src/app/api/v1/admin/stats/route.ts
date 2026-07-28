import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAdminSession } from "@/lib/security";

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  return token ? verifyAdminSession(token) : null;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const totalLicenses = await prisma.license.count();
  const activeLicenses = await prisma.license.count({ where: { status: "ACTIVE" } });
  const expiredLicenses = await prisma.license.count({ where: { status: "EXPIRED" } });
  const revokedLicenses = await prisma.license.count({ where: { status: "REVOKED" } });
  const totalDevices = await prisma.device.count();

  const totalActivations = await prisma.activityLog.count({ where: { action: "ACTIVATION_SUCCESS" } });
  const totalValidations = await prisma.activityLog.count({ where: { action: "VALIDATION_SUCCESS" } });
  const totalHeartbeats = await prisma.activityLog.count({ where: { action: "HEARTBEAT_SUCCESS" } });
  const totalFailedAttempts = await prisma.activityLog.count({
    where: {
      action: { in: ["ACTIVATION_FAILED", "VALIDATION_FAILED", "HEARTBEAT_FAILED", "EXPIRED_ATTEMPT", "REVOKED_ATTEMPT", "DISABLED_ATTEMPT"] },
    },
  });

  return NextResponse.json({
    success: true,
    stats: {
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      revokedLicenses,
      totalDevices,
      totalActivations,
      totalValidations,
      totalHeartbeats,
      totalFailedAttempts,
    },
  });
}
