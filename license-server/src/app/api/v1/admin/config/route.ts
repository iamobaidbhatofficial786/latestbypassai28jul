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

  const configs = await prisma.configuration.findMany();
  const configMap: Record<string, string> = {};
  configs.forEach((c) => {
    configMap[c.key] = c.value;
  });

  return NextResponse.json({ success: true, config: configMap });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    await prisma.configuration.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  await logAudit({
    adminId: session.adminId,
    action: "UPDATE_CONFIG",
    details: body,
  });

  return NextResponse.json({ success: true, message: "Configuration saved." });
}
