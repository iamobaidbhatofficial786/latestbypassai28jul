import { PrismaClient } from "@prisma/client";

const urls = [
  "postgresql://postgres:%23%40Passcode%40786921@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  "postgresql://postgres:%23%40Passcode%40786921@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  "postgresql://postgres:%23%40Passcode%40786921@db.cwbvlabylhizgzumorce.supabase.co:5432/postgres?sslmode=require",
];

async function testAll() {
  for (const u of urls) {
    console.log("Testing URL:", u);
    const p = new PrismaClient({ datasources: { db: { url: u } } });
    try {
      const users = await p.adminUser.findMany();
      console.log("SUCCESS! User count:", users.length);
      await p.$disconnect();
      return;
    } catch (e: any) {
      console.log("FAILED:", e.message);
      await p.$disconnect();
    }
  }
}

testAll();
