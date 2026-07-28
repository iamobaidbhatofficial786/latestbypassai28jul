import { PrismaClient } from "@prisma/client";

// Testing pooler tenant URL formats for Supabase IPv4 compatibility
const tenantPoolers = [
  "postgresql://postgres.cwbvlabylhizgzumorce:%23%40Passcode%40786921@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  "postgresql://postgres.cwbvlabylhizgzumorce:%23%40Passcode%40786921@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  "postgresql://postgres.cwbvlabylhizgzumorce:%23%40Passcode%40786921@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  "postgresql://postgres.cwbvlabylhizgzumorce:%23%40Passcode%40786921@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
];

async function testPoolers() {
  for (const u of tenantPoolers) {
    console.log("Testing Pooler URL:", u);
    const p = new PrismaClient({ datasources: { db: { url: u } } });
    try {
      const users = await p.adminUser.findMany();
      console.log("FOUND WORKING POOLER URL!", u);
      console.log("User count:", users.length);
      await p.$disconnect();
      return;
    } catch (e: any) {
      console.log("Pooler failed:", e.message);
      await p.$disconnect();
    }
  }
}

testPoolers();
