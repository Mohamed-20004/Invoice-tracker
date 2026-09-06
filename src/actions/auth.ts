"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminPassword } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { isLockedOut, recordLoginAttempt } from "@/lib/rate-limit";

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export interface LoginState {
  error?: string;
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter your password." };
  }

  const ip = await clientIp();
  if (await isLockedOut(ip)) {
    return { error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const ok = await verifyAdminPassword(password);
  await recordLoginAttempt(ip, ok);
  if (!ok) {
    return { error: "Incorrect password." };
  }

  await setSessionCookie();
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
