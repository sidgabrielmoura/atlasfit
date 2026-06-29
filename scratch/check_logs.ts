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
  const log = await prisma.auditLog.findUnique({
    where: { id: "cmqwkhmdo0002p4vkonsbao87" }
  });
  console.log("Full Action/Error:\n", log?.action);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
