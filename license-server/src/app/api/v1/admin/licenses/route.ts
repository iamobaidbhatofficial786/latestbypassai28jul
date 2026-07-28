import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAdminSession, generateLicenseKey } from "@/lib/security";
import { logAudit } from "@/lib/logging";
import { LicensePlan } from "@prisma/client";

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  return token ? verifyAdminSession(token) : null;
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const plan = searchParams.get("plan") || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { key: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { customerNotes: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (plan) where.plan = plan;

  const licenses = await prisma.license.findMany({
    where,
    include: {
      devices: true,
      _count: { select: { activityLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, licenses });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { plan, maxDevices, expiresAt, customerEmail, customerNotes } = await req.json();

    const key = generateLicenseKey();

    let validPlan: LicensePlan = "YEARLY";
    if (plan && Object.values(LicensePlan).includes(plan)) {
      validPlan = plan as LicensePlan;
    }

    let expiryDate: Date | null = null;
    if (expiresAt) {
      expiryDate = new Date(expiresAt);
    } else {
      // Auto duration defaults if not custom date provided
      const now = new Date();
      if (validPlan === "MONTHLY") expiryDate = new Date(now.setMonth(now.getMonth() + 1));
      else if (validPlan === "QUARTERLY") expiryDate = new Date(now.setMonth(now.getMonth() + 3));
      else if (validPlan === "YEARLY") expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
      else if (validPlan === "LIFETIME") expiryDate = null;
    }

    const license = await prisma.license.create({
      data: {
        key,
        plan: validPlan,
        maxDevices: Number(maxDevices) || (validPlan === "MONTHLY" ? 1 : validPlan === "QUARTERLY" ? 2 : 3),
        expiresAt: expiryDate,
        customerEmail: customerEmail ? String(customerEmail).trim() : null,
        customerNotes: customerNotes ? String(customerNotes).trim() : null,
        status: "ACTIVE",
      },
    });

    await logAudit({
      adminId: session.adminId,
      action: "CREATE_LICENSE",
      targetType: "License",
      targetId: license.id,
      details: { key, plan: validPlan, expiresAt: expiryDate },
    });

    return NextResponse.json({ success: true, license });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Failed to create license." }, { status: 500 });
  }
}
