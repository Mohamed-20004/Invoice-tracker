"use client";

import { useState } from "react";
import { formatPence, parsePoundsToPence } from "@/lib/money";

export interface PricingRates {
  calloutFeePence: number;
  hourlyRateWeekdayPence: number;
  hourlyRateOutOfHoursPence: number;
  billingIncrementMinutes: number;
  materialsMarkupPercent: number;
  vatRegistered: boolean;
  vatRatePercent: number;
}

interface EstimateItem {
  description: string;
  quantity: number;
  unitPricePence: number;
}

export function PricingCalculator({ rates }: { rates: PricingRates }) {
  const [hours, setHours] = useState("1");
  const [outOfHours, setOutOfHours] = useState(false);
  const [includeCallout, setIncludeCallout] = useState(true);
  const [materials, setMaterials] = useState("");
  const [markup, setMarkup] = useState(String(rates.materialsMarkupPercent));

  const hourlyRate = outOfHours
    ? rates.hourlyRateOutOfHoursPence
    : rates.hourlyRateWeekdayPence;

  // Bill in increments: round hours up to the nearest billing increment.
  const rawHours = Number(hours) || 0;
  const increment = rates.billingIncrementMinutes / 60;
  const billedHours =
    rawHours > 0 && increment > 0
      ? Math.ceil(rawHours / increment) * increment
      : rawHours;

  const labourPence = Math.round(billedHours * hourlyRate);
  const calloutPence = includeCallout ? rates.calloutFeePence : 0;
  const materialsCostPence = parsePoundsToPence(materials);
  const markupPercent = Number(markup) || 0;
  const materialsChargePence = Math.round(
    materialsCostPence * (1 + markupPercent / 100)
  );
  const netPence = labourPence + calloutPence + materialsChargePence;
  const vatPence = rates.vatRegistered
    ? Math.round((netPence * rates.vatRatePercent) / 100)
    : 0;
  const totalPence = netPence + vatPence;

  const items: EstimateItem[] = [];
  if (calloutPence > 0) {
    items.push({ description: "Call-out fee", quantity: 1, unitPricePence: calloutPence });
  }
  if (labourPence > 0) {
    items.push({
      description: `Labour${outOfHours ? " (out of hours)" : ""} — ${billedHours} h`,
      quantity: billedHours,
      unitPricePence: hourlyRate,
    });
  }
  if (materialsChargePence > 0) {
    items.push({
      description: "Materials",
      quantity: 1,
      unitPricePence: materialsChargePence,
    });
  }
  const prefill =
    typeof window === "undefined"
      ? ""
      : btoa(JSON.stringify(items))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none";

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Job estimate</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Hours on site</label>
          <input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" className={inputCls} />
          {billedHours !== rawHours && rawHours > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Billed as {billedHours} h ({rates.billingIncrementMinutes}-min increments)
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Materials cost £</label>
          <input value={materials} onChange={(e) => setMaterials(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Materials markup %</label>
          <input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="numeric" className={inputCls} />
        </div>
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={outOfHours} onChange={(e) => setOutOfHours(e.target.checked)} className="h-4 w-4 accent-brand-700" />
            Out of hours ({formatPence(rates.hourlyRateOutOfHoursPence)}/h vs {formatPence(rates.hourlyRateWeekdayPence)}/h)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeCallout} onChange={(e) => setIncludeCallout(e.target.checked)} className="h-4 w-4 accent-brand-700" />
            Include call-out fee ({formatPence(rates.calloutFeePence)})
          </label>
        </div>
      </div>

      <div className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-sm">
        {calloutPence > 0 && <p>Call-out: <span className="font-medium">{formatPence(calloutPence)}</span></p>}
        <p>Labour ({billedHours || 0} h): <span className="font-medium">{formatPence(labourPence)}</span></p>
        {materialsChargePence > 0 && (
          <p>Materials (+{markupPercent}%): <span className="font-medium">{formatPence(materialsChargePence)}</span></p>
        )}
        {rates.vatRegistered && (
          <>
            <p>Net: <span className="font-medium">{formatPence(netPence)}</span></p>
            <p>VAT ({rates.vatRatePercent}%): <span className="font-medium">{formatPence(vatPence)}</span></p>
          </>
        )}
        <p className="pt-1 text-xl font-bold text-brand-800">Total: {formatPence(totalPence)}</p>
      </div>

      <a
        href={items.length ? `/invoices/new?prefill=${prefill}` : "/invoices/new"}
        className="mt-4 inline-block rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Create invoice from this estimate →
      </a>
    </div>
  );
}
