"use client";

import { useState, useTransition } from "react";
import {
  computeTotals,
  formatPence,
  parsePoundsToPence,
  penceToPoundsInput,
} from "@/lib/money";
import type { InvoicePayload } from "@/actions/invoices";
import { emptyRow, type BuilderRow } from "@/lib/builder-rows";

export interface BuilderCustomer {
  id: string;
  name: string;
}

export interface BuilderInitial {
  customerId: string;
  jobAddress: string;
  notes: string;
  supplyDate: string;
  rows: BuilderRow[];
}

export function InvoiceBuilder({
  customers,
  vatRegistered,
  vatRatePercent,
  initial,
  onSubmit,
  submitLabel,
}: {
  customers: BuilderCustomer[];
  vatRegistered: boolean;
  vatRatePercent: number;
  initial?: BuilderInitial;
  onSubmit: (payload: InvoicePayload) => Promise<void>;
  submitLabel: string;
}) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [jobAddress, setJobAddress] = useState(initial?.jobAddress ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [supplyDate, setSupplyDate] = useState(initial?.supplyDate ?? "");
  const [rows, setRows] = useState<BuilderRow[]>(
    initial?.rows?.length ? initial.rows : [emptyRow()]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsedItems = rows.map((row) => ({
    quantity: Number(row.quantity) || 0,
    unitPricePence: parsePoundsToPence(row.unitPrice),
    included: row.included && row.description.trim().length > 0,
  }));
  const totals = computeTotals(parsedItems, vatRegistered, vatRatePercent);

  function updateRow(key: string, patch: Partial<BuilderRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function moveRow(key: string, dir: -1 | 1) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      setError("Choose a customer.");
      return;
    }
    const lineItems = rows
      .filter((r) => r.description.trim().length > 0)
      .map((r) => ({
        description: r.description,
        quantity: Number(r.quantity) || 1,
        unitPricePence: parsePoundsToPence(r.unitPrice),
        included: r.included,
      }));
    if (lineItems.length === 0) {
      setError("Add at least one line item with a description.");
      return;
    }
    startTransition(async () => {
      try {
        await onSubmit({ customerId, jobAddress, notes, supplyDate, lineItems });
      } catch (err) {
        // next/navigation redirects throw — let them through
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Failed to save invoice.");
      }
    });
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Customer</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Job address <span className="font-normal text-slate-400">(used to match bank payments)</span>
          </label>
          <input
            value={jobAddress}
            onChange={(e) => setJobAddress(e.target.value)}
            placeholder="e.g. 12 Acacia Road, N19"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Date of supply <span className="font-normal text-slate-400">(if different from invoice date)</span>
          </label>
          <input
            type="date"
            value={supplyDate}
            onChange={(e) => setSupplyDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Shown at the bottom of the invoice"
            className={inputCls}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="w-10 px-1 py-2" title="Include in totals">In</th>
              <th className="px-1 py-2">Description</th>
              <th className="w-20 px-1 py-2">Qty</th>
              <th className="w-28 px-1 py-2">Unit price £</th>
              <th className="w-24 px-1 py-2 text-right">Total</th>
              <th className="w-24 px-1 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const rowTotal = Math.round(
                (Number(row.quantity) || 0) * parsePoundsToPence(row.unitPrice)
              );
              const excluded = !row.included;
              return (
                <tr key={row.key} className={excluded ? "opacity-50" : ""}>
                  <td className="px-1 py-1.5">
                    <input
                      type="checkbox"
                      checked={row.included}
                      onChange={(e) => updateRow(row.key, { included: e.target.checked })}
                      aria-label="Include line in totals"
                      className="h-4 w-4 accent-brand-700"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.key, { description: e.target.value })}
                      placeholder="e.g. Replace kitchen tap"
                      className={`${inputCls} ${excluded ? "line-through" : ""}`}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      inputMode="decimal"
                      className={inputCls}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </td>
                  <td className={`px-1 py-1.5 text-right font-medium ${excluded ? "line-through" : ""}`}>
                    {formatPence(rowTotal)}
                  </td>
                  <td className="px-1 py-1.5 text-right whitespace-nowrap">
                    <button type="button" onClick={() => moveRow(row.key, -1)} disabled={idx === 0}
                      className="px-1 text-slate-400 hover:text-brand-700 disabled:opacity-30" aria-label="Move up">↑</button>
                    <button type="button" onClick={() => moveRow(row.key, 1)} disabled={idx === rows.length - 1}
                      className="px-1 text-slate-400 hover:text-brand-700 disabled:opacity-30" aria-label="Move down">↓</button>
                    <button type="button"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      className="px-1 text-slate-400 hover:text-red-600" aria-label="Remove line">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="mt-3 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-brand-600 hover:text-brand-700"
        >
          + Add line
        </button>
      </div>

      <div className="flex flex-col items-end gap-1 rounded-xl bg-white p-5 shadow-sm text-sm">
        {vatRegistered ? (
          <>
            <p>Subtotal (net): <span className="font-medium">{formatPence(totals.subtotalPence)}</span></p>
            <p>VAT ({vatRatePercent}%): <span className="font-medium">{formatPence(totals.vatPence)}</span></p>
            <p className="text-lg font-bold text-brand-800">Total: {formatPence(totals.totalPence)}</p>
          </>
        ) : (
          <p className="text-lg font-bold text-brand-800">Total: {formatPence(totals.totalPence)}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
