import { prisma } from "./db";
import { ActionType } from "@prisma/client";

export async function logActivity(opts: {
  licenseId?: string;
  deviceId?: string;
  action: ActionType;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any> | string;
}) {
  try {
    const detailsStr = typeof opts.details === "object" ? JSON.stringify(opts.details) : opts.details;
    await prisma.activityLog.create({
      data: {
        licenseId: opts.licenseId || null,
        deviceId: opts.deviceId || null,
        action: opts.action,
        ipAddress: opts.ipAddress || null,
        userAgent: opts.userAgent || null,
        details: detailsStr || null,
      },
    });
  } catch (e) {
    console.error("[ActivityLog Error]", e);
  }
}

export async function logAudit(opts: {
  adminId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any> | string;
  ipAddress?: string;
}) {
  try {
    const detailsStr = typeof opts.details === "object" ? JSON.stringify(opts.details) : opts.details;
    await prisma.auditLog.create({
      data: {
        adminId: opts.adminId || null,
        action: opts.action,
        targetType: opts.targetType || null,
        targetId: opts.targetId || null,
        details: detailsStr || null,
        ipAddress: opts.ipAddress || null,
      },
    });
  } catch (e) {
    console.error("[AuditLog Error]", e);
  }
}
