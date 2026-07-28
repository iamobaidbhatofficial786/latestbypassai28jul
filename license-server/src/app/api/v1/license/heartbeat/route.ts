import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLicenseToken, signLicenseToken } from "@/lib/security";
import { logActivity } from "@/lib/logging";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, device_id, extension_version } = body;

    if (!token || !device_id) {
      return NextResponse.json({ success: false, error: "Token and device_id are required." }, { status: 400 });
    }

    const payload = verifyLicenseToken(token);
    if (!payload || payload.deviceId !== device_id) {
      return NextResponse.json({ success: false, error: "Token expired or invalid." }, { status: 401 });
    }

    const license = await prisma.license.findUnique({
      where: { id: payload.licenseId },
      include: { devices: true },
    });

    if (!license || license.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, status: license?.status || "REVOKED", error: "License is no longer active." },
        { status: 403 }
      );
    }

    if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
      await prisma.license.update({ where: { id: license.id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ success: false, status: "EXPIRED", error: "License key expired." }, { status: 403 });
    }

    const registeredDevice = license.devices.find((d) => d.deviceId === device_id);
    if (!registeredDevice) {
      return NextResponse.json({ success: false, error: "Device registration revoked." }, { status: 403 });
    }

    // Update last seen timestamp
    await prisma.device.update({
      where: { id: registeredDevice.id },
      data: {
        lastSeenAt: new Date(),
        extensionVersion: extension_version || registeredDevice.extensionVersion,
      },
    });

    // Issue refreshed short-lived token
    const freshToken = signLicenseToken({
      licenseId: license.id,
      key: license.key,
      deviceId: device_id,
      plan: license.plan,
      expiresAt: license.expiresAt ? license.expiresAt.toISOString() : null,
    });

    await logActivity({
      licenseId: license.id,
      deviceId: device_id,
      action: "HEARTBEAT_SUCCESS",
    });

    return NextResponse.json({
      success: true,
      token: freshToken,
      status: license.status,
      expires_at: license.expiresAt ? license.expiresAt.toISOString() : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Heartbeat failed." }, { status: 500 });
  }
}
