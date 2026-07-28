import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAdminSession } from "@/lib/security";

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  return token ? verifyAdminSession(token) : null;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target") || "licenses";
  const format = searchParams.get("format") || "csv";

  if (target === "licenses") {
    const licenses = await prisma.license.findMany({
      include: { _count: { select: { devices: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      return new Response(JSON.stringify(licenses, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename=licenses_export_${Date.now()}.json`,
        },
      });
    }

    const headers = "ID,Key,Plan,Status,MaxDevices,ActiveDevices,ExpiresAt,CustomerEmail,CustomerNotes,CreatedAt\n";
    const rows = licenses
      .map(
        (l) =>
          `"${l.id}","${l.key}","${l.plan}","${l.status}",${l.maxDevices},${l._count.devices},"${l.expiresAt || ""}","${l.customerEmail || ""}","${l.customerNotes || ""}","${l.createdAt.toISOString()}"`
      )
      .join("\n");

    return new Response(headers + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=licenses_export_${Date.now()}.csv`,
      },
    });
  }

  const logs = await prisma.activityLog.findMany({
    take: 1000,
    orderBy: { createdAt: "desc" },
  });

  if (format === "json") {
    return new Response(JSON.stringify(logs, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=activity_logs_${Date.now()}.json`,
      },
    });
  }

  const headers = "ID,LicenseID,DeviceID,Action,IP,Details,CreatedAt\n";
  const rows = logs
    .map(
      (l) =>
        `"${l.id}","${l.licenseId || ""}","${l.deviceId || ""}","${l.action}","${l.ipAddress || ""}","${(l.details || "").replace(/"/g, '""')}","${l.createdAt.toISOString()}"`
    )
    .join("\n");

  return new Response(headers + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=activity_logs_${Date.now()}.csv`,
    },
  });
}
