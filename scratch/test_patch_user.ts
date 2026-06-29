import prisma from "../src/lib/prisma";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const id = "cmqwjsge0000004l75vth5pon";
  console.log("Updating user...");
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: null
      }
    });
    console.log("Success!", updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
