import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Updating all users to set twoFactorEnabled to null (inherit global by default)...");
  const result = await prisma.user.updateMany({
    data: {
      twoFactorEnabled: null
    }
  });
  console.log("Updated users count:", result.count);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
