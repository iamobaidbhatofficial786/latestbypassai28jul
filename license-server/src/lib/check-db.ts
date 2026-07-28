import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

process.env.DATABASE_URL = "postgresql://postgres:%23%40Passcode%40786921@db.agsjhtonhjiornxhlmba.supabase.co:5432/postgres";

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.adminUser.findMany();
  console.log("AdminUsers count:", users.length);
  for (const u of users) {
    console.log("User in DB:", u.email);
    const match = await bcrypt.compare("#@Passcode@786921", u.passwordHash);
    console.log("Password '#@Passcode@786921' valid?:", match);
  }
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
