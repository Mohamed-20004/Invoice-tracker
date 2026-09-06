"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/actions/guard";
import { parsePoundsToPence } from "@/lib/money";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function intOr(formData: FormData, key: string, fallback: number): number {
  const value = Number(str(formData, key));
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

export async function updateCompanySettings(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      companyName: str(formData, "companyName"),
      companyNumber: str(formData, "companyNumber"),
      registeredAddress: str(formData, "registeredAddress"),
      placeOfRegistration: str(formData, "placeOfRegistration"),
      vatRegistered: formData.get("vatRegistered") === "on",
      vatNumber: str(formData, "vatNumber"),
      vatRatePercent: intOr(formData, "vatRatePercent", 20),
      contactEmail: str(formData, "contactEmail"),
      contactPhone: str(formData, "contactPhone"),
      bankAccountName: str(formData, "bankAccountName"),
      bankSortCode: str(formData, "bankSortCode"),
      bankAccountNumber: str(formData, "bankAccountNumber"),
      paymentTermsDays: intOr(formData, "paymentTermsDays", 14),
    },
  });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function updatePricingSettings(formData: FormData): Promise<void> {
  await requireAuth();
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      calloutFeePence: parsePoundsToPence(str(formData, "calloutFee")),
      hourlyRateWeekdayPence: parsePoundsToPence(str(formData, "hourlyRateWeekday")),
      hourlyRateOutOfHoursPence: parsePoundsToPence(str(formData, "hourlyRateOutOfHours")),
      dayRatePence: parsePoundsToPence(str(formData, "dayRate")),
      billingIncrementMinutes: intOr(formData, "billingIncrementMinutes", 15),
      materialsMarkupPercent: intOr(formData, "materialsMarkupPercent", 20),
    },
  });
  revalidatePath("/pricing");
  redirect("/pricing?saved=1");
}
