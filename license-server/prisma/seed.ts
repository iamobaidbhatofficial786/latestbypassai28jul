import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@powerkits.net";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "ChangeMeInProduction123!";

  console.log(`[Seed] Checking initial admin account (${adminEmail})...`);

  const existing = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: passwordHash,
        role: "SUPERADMIN",
      },
    });
    console.log(`[Seed] Initial admin account created successfully!`);
  } else {
    console.log(`[Seed] Admin account already exists.`);
  }

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
