const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL in .env file");
  process.exit(1);
}

async function main() {
  console.log("Testing Prisma connection...");
  const adapter = new PrismaPg(connectionString);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.log("SUCCESS! Users found:", users.length);
    if (users.length > 0) {
      console.log("First user:", users[0].email);
    }
  } catch (e) {
    console.log("ERROR:", e.message);
    console.log("CODE:", e.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
