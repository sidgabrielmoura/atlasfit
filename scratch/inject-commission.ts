import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Load .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
    if (match) {
      process.env.DATABASE_URL = match[1];
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada no arquivo .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando injeção de saldo de teste...");

  // 1. Find Marcos Almeida
  const marcos = await prisma.user.findFirst({
    where: {
      name: {
        contains: "Marcos Almeida",
        mode: "insensitive"
      }
    }
  });

  if (!marcos) {
    console.error("Personal 'Marcos Almeida' não encontrado no banco de dados.");
    process.exit(1);
  }

  console.log(`Personal encontrado: ${marcos.name} (ID: ${marcos.id})`);

  // 2. Find or create another trainer/user to represent the referred student
  let referredUser = await prisma.user.findFirst({
    where: {
      NOT: {
        id: marcos.id
      }
    }
  });

  if (!referredUser) {
    console.log("Criando usuário de teste para simular o indicado...");
    referredUser = await prisma.user.create({
      data: {
        name: "Indicado de Teste",
        email: `indicadoteste-${Date.now()}@test.com`,
        role: "TRAINER"
      }
    });
  }

  console.log(`Usuário indicado simulado: ${referredUser.name} (ID: ${referredUser.id})`);

  // 3. Create dummy transaction
  const amountPaid = 10.0; // R$ 10,00
  const commissionPercent = 20.0; // 20%
  const commissionAmount = 2.0; // R$ 2,00 (20% of 10)

  const transaction = await prisma.transaction.create({
    data: {
      userId: referredUser.id,
      amount: amountPaid,
      status: "APPROVED",
      paymentMethod: "PIX",
      description: "Assinatura de teste para comissão de Marcos Almeida"
    }
  });

  console.log(`Transação criada: ${transaction.id} no valor de R$ ${amountPaid}`);

  // 4. Create ReferralCommission
  const commission = await prisma.referralCommission.create({
    data: {
      referrerId: marcos.id,
      referredId: referredUser.id,
      transactionId: transaction.id,
      amount: commissionAmount,
      percentage: commissionPercent,
      status: "APROVADO"
    }
  });

  console.log(`Comissão de R$ ${commission.amount} injetada com sucesso! ID: ${commission.id}`);
}

main()
  .catch((e) => {
    console.error("Erro ao executar script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
