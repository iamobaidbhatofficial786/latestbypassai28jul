import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLicenseToken } from "@/lib/security";
import { logActivity } from "@/lib/logging";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, device_id } = body;

    if (!token || !device_id) {
      return NextResponse.json({ success: false, error: "Token and device_id are required." }, { status: 400 });
    }

    const payload = verifyLicenseToken(token);
    if (!payload || payload.deviceId !== device_id) {
      return NextResponse.json({ success: false, error: "Invalid token or device mismatch." }, { status: 401 });
    }

    const device = await prisma.device.findFirst({
      where: { licenseId: payload.licenseId, deviceId: device_id },
    });

    if (device) {
      await prisma.device.delete({ where: { id: device.id } });
      await logActivity({
        licenseId: payload.licenseId,
        deviceId: device_id,
        action: "DEACTIVATED",
      });
    }

    return NextResponse.json({ success: true, message: "Device successfully deactivated." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Deactivation failed." }, { status: 500 });
  }
}
