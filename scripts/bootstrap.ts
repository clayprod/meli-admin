import { PrismaClient, UserRole, TaxRegime } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const orgName = process.env.BOOTSTRAP_ORG_NAME ?? "Tenryu";
  const orgSlug = process.env.BOOTSTRAP_ORG_SLUG ?? "tenryu";
  const orgId = process.env.BOOTSTRAP_ORG_ID ?? "org_default_tenryu";
  const taxRegime = (process.env.BOOTSTRAP_TAX_REGIME as TaxRegime | undefined) ?? TaxRegime.SIMPLES_NACIONAL;
  const simplesAnexo = process.env.BOOTSTRAP_SIMPLES_ANEXO ?? "I";

  const email = process.env.BOOTSTRAP_USER_EMAIL;
  const password = process.env.BOOTSTRAP_USER_PASSWORD;

  if (!email || !password) {
    console.error("Defina BOOTSTRAP_USER_EMAIL e BOOTSTRAP_USER_PASSWORD antes de rodar.");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("BOOTSTRAP_USER_PASSWORD deve ter pelo menos 12 caracteres.");
    process.exit(1);
  }

  const org = await prisma.org.upsert({
    where: { id: orgId },
    update: {
      name: orgName,
      slug: orgSlug,
      taxRegime,
      simplesAnexo,
    },
    create: {
      id: orgId,
      name: orgName,
      slug: orgSlug,
      taxRegime,
      simplesAnexo,
    },
  });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      orgId: org.id,
      role: UserRole.OWNER,
      passwordHash,
      active: true,
    },
    create: {
      orgId: org.id,
      email: email.toLowerCase(),
      passwordHash,
      role: UserRole.OWNER,
      active: true,
    },
  });

  console.log(`Org pronta: ${org.name} (${org.id})`);
  console.log(`User OWNER pronto: ${user.email} (${user.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
