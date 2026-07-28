import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLicenseToken } from "@/lib/security";
import { logActivity } from "@/lib/logging";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, device_id } = body;

    if (!token || !device_id) {
      return NextResponse.json({ valid: false, error: "Token and device_id are required." }, { status: 400 });
    }

    const payload = verifyLicenseToken(token);
    if (!payload || payload.deviceId !== device_id) {
      return NextResponse.json({ valid: false, error: "Invalid or expired token." }, { status: 401 });
    }

    const license = await prisma.license.findUnique({
      where: { id: payload.licenseId },
      include: { devices: true },
    });

    if (!license) {
      return NextResponse.json({ valid: false, error: "License not found." }, { status: 404 });
    }

    if (license.status !== "ACTIVE") {
      return NextResponse.json({ valid: false, status: license.status, error: `License status is ${license.status}.` }, { status: 403 });
    }

    if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
      return NextResponse.json({ valid: false, status: "EXPIRED", error: "License key expired." }, { status: 403 });
    }

    const registeredDevice = license.devices.find((d) => d.deviceId === device_id);
    if (!registeredDevice) {
      return NextResponse.json({ valid: false, error: "Device is not activated for this license." }, { status: 403 });
    }

    await logActivity({
      licenseId: license.id,
      deviceId: device_id,
      action: "VALIDATION_SUCCESS",
    });

    return NextResponse.json({
      valid: true,
      status: license.status,
      plan: license.plan,
      expires_at: license.expiresAt ? license.expiresAt.toISOString() : null,
    });
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: "Validation request failed." }, { status: 500 });
  }
}
