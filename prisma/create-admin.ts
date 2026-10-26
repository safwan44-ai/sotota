import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { checkPasswordStrength, hashPassword } from "../src/lib/password";
import { askHidden, askLine } from "./prompt";

// Creates the first admin login, or changes an admin's password.
// The password is typed hidden and is never saved anywhere: only a one-way
// hash goes into the database.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Create or reset an admin login for Sotota\n");

  const email = (await askLine("Email: ")).trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log("That email does not look right.");
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  let name = existing ? existing.name : "";

  if (existing) {
    const answer = await askLine(
      `An admin with this email already exists (${existing.name}). Change the password? (y/N): `
    );
    if (answer.trim().toLowerCase() !== "y") {
      console.log("Nothing was changed.");
      return;
    }
  } else {
    name = (await askLine("Name (shown in the admin panel): ")).trim();
    if (name.length < 2 || name.length > 80) {
      console.log("The name must be 2 to 80 characters.");
      process.exitCode = 1;
      return;
    }
  }

  let password = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const first = await askHidden(
      "New password (hidden, at least 12 characters): "
    );
    const problem = checkPasswordStrength(first, email);
    if (problem) {
      console.log(problem);
      continue;
    }
    const second = await askHidden("Type the same password again: ");
    if (first !== second) {
      console.log("The two passwords are different.");
      continue;
    }
    password = first;
    break;
  }

  if (!password) {
    console.log("No password was set.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);

  if (existing) {
    await prisma.adminUser.update({ where: { email }, data: { passwordHash } });
    console.log("\nPassword changed. All older logins were signed out.");
  } else {
    await prisma.adminUser.create({ data: { email, name, passwordHash } });
    console.log("\nAdmin created. You can now log in at /admin/login");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });