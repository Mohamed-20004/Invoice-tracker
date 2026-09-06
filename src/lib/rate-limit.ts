import { prisma } from "@/lib/db";

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

export async function isLockedOut(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const failures = await prisma.loginAttempt.count({
    where: { ip, success: false, createdAt: { gte: since } },
  });
  return failures >= MAX_FAILURES;
}

export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { ip, success } });
  if (success) {
    // A successful login clears the slate for this IP.
    await prisma.loginAttempt.deleteMany({ where: { ip, success: false } });
  }
}
