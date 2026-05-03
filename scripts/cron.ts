import cron from "node-cron";

type Scope = "payments" | "listings" | "promotions" | "ads" | "all";

const APP_URL = process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

if (!CRON_SECRET) {
  console.error("[cron] CRON_SECRET nao configurado. Defina no .env antes de iniciar.");
  process.exit(1);
}

const SCHEDULES: Array<{ cron: string; scope: Scope; description: string }> = [
  { cron: "*/5 * * * *", scope: "payments", description: "Mercado Pago payments (last 24h)" },
  { cron: "*/30 * * * *", scope: "listings", description: "Mercado Livre listings" },
  { cron: "0 */2 * * *", scope: "promotions", description: "Mercado Livre promotions" },
  { cron: "0 */4 * * *", scope: "ads", description: "Mercado Livre ad metrics" },
];

async function tick(scope: Scope) {
  const url = `${APP_URL}/api/cron/sync-tick?scope=${scope}`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });

    const elapsedMs = Date.now() - start;
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      console.error(`[cron] ${scope} failed`, response.status, body);
      return;
    }

    console.log(`[cron] ${scope} ok in ${elapsedMs}ms`);
  } catch (error) {
    console.error(`[cron] ${scope} fetch error`, error);
  }
}

console.log(`[cron] starting scheduler against ${APP_URL}`);

for (const schedule of SCHEDULES) {
  console.log(`[cron] register ${schedule.cron} -> ${schedule.scope} (${schedule.description})`);
  cron.schedule(schedule.cron, () => {
    void tick(schedule.scope);
  });
}

const runOnStartup = process.argv.includes("--run-now");
if (runOnStartup) {
  console.log("[cron] --run-now flag set, ticking all scopes immediately");
  void tick("all");
}

process.on("SIGINT", () => {
  console.log("[cron] SIGINT received, stopping");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("[cron] SIGTERM received, stopping");
  process.exit(0);
});
