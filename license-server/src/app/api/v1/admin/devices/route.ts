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

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await prisma.device.findMany({
    include: {
      license: {
        select: { key: true, customerEmail: true, plan: true, status: true },
      },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json({ success: true, devices });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Device DB id required" }, { status: 400 });

  const device = await prisma.device.findUnique({ where: { id } });
  if (device) {
    await prisma.device.delete({ where: { id } });
    await logAudit({
      adminId: session.adminId,
      action: "REMOVE_DEVICE",
      targetType: "Device",
      targetId: id,
      details: { deviceId: device.deviceId, licenseId: device.licenseId },
    });
  }

  return NextResponse.json({ success: true, message: "Device successfully removed." });
}
