//purpose of the seed file is to populate database w/ inital data
import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    // upsert updates user if present, creats it if not
    where: { email: "admorales3@wisc.edu" },
    update: {
      user_name: "Angel Morales",
      password: "1234",
    },
    create: {
      email: "admorales3@wisc.edu",
      user_name: "Angel Morales",
      password: "1234",
    },
  });
}

main().then(() => prisma.$disconnect());
