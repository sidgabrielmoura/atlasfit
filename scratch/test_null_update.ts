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
  const userId = "cmqwjsge0000004l75vth5pon";
  console.log("Attempting to update user twoFactorEnabled to null...");
  const result = await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: null
    }
  });
  console.log("Update success!", result);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
