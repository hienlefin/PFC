import { prisma } from "@/lib/prisma";
import { runDispatchJob } from "@/server/notification/dispatch";
import { runExpireJob, runRemindJob } from "@/server/jobs/opportunity-jobs";

const intervalMs = Number(process.env.JOB_INTERVAL_MS || 15 * 60 * 1000);

async function tick() {
  const expire = await runExpireJob();
  const remind = await runRemindJob();
  const dispatch = await runDispatchJob();
  console.log(JSON.stringify({ at: new Date().toISOString(), expire, remind, dispatch }));
}

async function main() {
  if (process.env.DATABASE_URL?.startsWith("file:")) {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  }
  await tick();
  setInterval(() => {
    tick().catch((err) => console.error(err));
  }, intervalMs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
