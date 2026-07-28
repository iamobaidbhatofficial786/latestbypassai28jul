import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signLicenseToken } from "@/lib/security";
import { logActivity } from "@/lib/logging";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, device_id, extension_version, metadata } = body;

    if (!key || !device_id) {
      return NextResponse.json(
        { success: false, error: "License key and device_id are required." },
        { status: 400 }
      );
    }

    const cleanKey = String(key).trim().toUpperCase();
    const cleanDeviceId = String(device_id).trim();

    const license = await prisma.license.findUnique({
      where: { key: cleanKey },
      include: { devices: true },
    });

    if (!license) {
      await logActivity({
        action: "ACTIVATION_FAILED",
        deviceId: cleanDeviceId,
        details: { reason: "License key not found", key: cleanKey },
      });
      return NextResponse.json({ success: false, error: "Invalid license key." }, { status: 404 });
    }

    if (license.status === "REVOKED") {
      await logActivity({
        licenseId: license.id,
        action: "REVOKED_ATTEMPT",
        deviceId: cleanDeviceId,
      });
      return NextResponse.json({ success: false, error: "This license has been revoked." }, { status: 403 });
    }

    if (license.status === "DISABLED") {
      await logActivity({
        licenseId: license.id,
        action: "DISABLED_ATTEMPT",
        deviceId: cleanDeviceId,
      });
      return NextResponse.json({ success: false, error: "This license has been disabled by support." }, { status: 403 });
    }

    if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
      await prisma.license.update({
        where: { id: license.id },
        data: { status: "EXPIRED" },
      });
      await logActivity({
        licenseId: license.id,
        action: "EXPIRED_ATTEMPT",
        deviceId: cleanDeviceId,
      });
      return NextResponse.json({ success: false, error: "This license key has expired." }, { status: 403 });
    }

    // Check existing device registration
    let device = license.devices.find((d) => d.deviceId === cleanDeviceId);

    if (!device) {
      if (license.devices.length >= license.maxDevices) {
        await logActivity({
          licenseId: license.id,
          action: "ACTIVATION_FAILED",
          deviceId: cleanDeviceId,
          details: { reason: "Device limit reached", activeDevices: license.devices.length, max: license.maxDevices },
        });
        return NextResponse.json(
          { success: false, error: `Device limit reached (${license.devices.length}/${license.maxDevices}). Deactivate a device first.` },
          { status: 429 }
        );
      }

      device = await prisma.device.create({
        data: {
          licenseId: license.id,
          deviceId: cleanDeviceId,
          metadata: metadata ? JSON.stringify(metadata) : null,
          extensionVersion: extension_version || null,
        },
      });
    } else {
      await prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          extensionVersion: extension_version || device.extensionVersion,
          metadata: metadata ? JSON.stringify(metadata) : device.metadata,
        },
      });
    }

    const token = signLicenseToken({
      licenseId: license.id,
      key: license.key,
      deviceId: cleanDeviceId,
      plan: license.plan,
      expiresAt: license.expiresAt ? license.expiresAt.toISOString() : null,
    });

    await logActivity({
      licenseId: license.id,
      deviceId: cleanDeviceId,
      action: "ACTIVATION_SUCCESS",
      details: { plan: license.plan, extensionVersion: extension_version },
    });

    return NextResponse.json({
      success: true,
      token,
      expires_at: license.expiresAt ? license.expiresAt.toISOString() : null,
      plan: license.plan,
      status: license.status,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Activation failed." }, { status: 500 });
  }
}
