import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = String(process.env.ADMIN_INITIAL_EMAIL || "admin@powerkits.net").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "ChangeMeInProduction123!";

  console.log(`[Seed] Checking initial admin account (${adminEmail})...`);

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash,
    },
    create: {
      email: adminEmail,
      passwordHash: passwordHash,
      role: "SUPERADMIN",
    },
  });
  console.log(`[Seed] Admin account (${adminEmail}) configured successfully!`);

  // Seed default configuration settings
  const configs = [
    { key: "min_extension_version", value: "6.0.0", description: "Minimum supported Chrome extension version" },
    { key: "latest_extension_version", value: "6.7.9", description: "Latest available Chrome extension version" },
    { key: "grace_period_hours", value: "72", description: "Offline grace period in hours" },
  ];

  for (const cfg of configs) {
    await prisma.configuration.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value, description: cfg.description },
      create: cfg,
    });
  }

  console.log(`[Seed] System configuration defaults established.`);
}

main()
  .catch((e) => {
    console.error("[Seed Error]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
