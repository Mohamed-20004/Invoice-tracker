"use client";

import { useState, useTransition } from "react";
import {
  computeTotals,
  formatPence,
  parsePoundsToPence,
} from "@/lib/money";
import type { InvoicePayload } from "@/actions/invoices";
import { emptyRow, type BuilderRow } from "@/lib/builder-rows";

// Company + document facts the invoice sheet displays (all read-only here;
// they come from Settings / the invoice record).
export interface BuilderContext {
  companyName: string;
  registeredAddress: string;
  contactEmail: string;
  contactPhone: string;
  vatRegistered: boolean;
  vatNumber: string;
  vatRatePercent: number;
  bankAccountName: string;
  bankAccountNumber: string;
  bankSortCode: string;
  website: string;
  numberLabel: string;
  issueDateLabel: string;
  dueDateLabel: string;
}

export interface BuilderInitial {
  customerName: string;
  customerAddress: string;
  customerEmail: string;
  customerPhone: string;
  jobAddress: string;
  notes: string;
  rows: BuilderRow[];
}

const YELLOW = "#FFCE07";

// Editable fields styled to sit invisibly inside the invoice sheet until
// focused, so the page reads as the finished template from the first paint.
const seamless =
  "w-full bg-transparent border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-slate-300 focus:bg-white placeholder:text-slate-400";

export function InvoiceBuilder({
  ctx,
  initial,
  onSubmit,
  submitLabel,
}: {
  ctx: BuilderContext;
  initial?: BuilderInitial;
  onSubmit: (payload: InvoicePayload) => Promise<void>;
  submitLabel: string;
}) {
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerAddress, setCustomerAddress] = useState(initial?.customerAddress ?? "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [jobAddress, setJobAddress] = useState(initial?.jobAddress ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
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
  const totals = computeTotals(parsedItems, ctx.vatRegistered, ctx.vatRatePercent);
  const exclVat = ctx.vatRegistered ? " (excl. VAT)" : "";

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
    if (!customerName.trim()) {
      setError("Fill in the customer's name in the BILL TO section.");
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
        await onSubmit({
          customerName,
          customerAddress,
          customerEmail,
          customerPhone,
          jobAddress,
          notes,
          lineItems,
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Failed to save invoice.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* The invoice sheet — a live replica of the PDF template */}
      <div className="mx-auto max-w-3xl bg-white shadow-md" style={{ fontFamily: "Arial, sans-serif" }}>
        <div className="p-6 sm:p-8">
          {/* Header band */}
          <div className="flex items-center gap-6 bg-black p-5 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-16 sm:w-20" />
            <div className="flex-1 min-w-0">
              <p className="text-base sm:text-lg font-bold">{ctx.companyName}</p>
              <p className="text-xs text-[#ADADAD]">{ctx.registeredAddress}</p>
              <p className="text-xs text-[#ADADAD]">
                {[ctx.contactEmail, ctx.contactPhone].filter(Boolean).join("  |  ")}
              </p>
              {ctx.vatRegistered && ctx.vatNumber && (
                <p className="text-xs text-[#ADADAD]">VAT No: {ctx.vatNumber}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl sm:text-5xl font-bold leading-none" style={{ color: YELLOW }}>
                INVOICE
              </p>
              <p className="mt-1 text-sm text-[#AAAAAA]"># {ctx.numberLabel}</p>
            </div>
          </div>
          <div className="mb-8 h-3" style={{ background: YELLOW }} />

          {/* Dates */}
          <div className="mb-9 flex w-3/4 gap-4 bg-[#F5F5F5] px-4 py-3">
            <div className="flex-1">
              <p className="text-xs text-[#555555]">Invoice Date</p>
              <p className="font-bold">{ctx.issueDateLabel}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#555555]">Due Date</p>
              <p className="font-bold">{ctx.dueDateLabel}</p>
            </div>
          </div>

          {/* Bill to / site address */}
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:gap-8">
            <div className="flex-1 border-l-4 pl-4" style={{ borderColor: YELLOW }}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#555555]">
                Bill To
              </p>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className={`${seamless} font-bold`}
              />
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder={"Address line 1\nAddress line 2\nCity\nPostcode"}
                rows={4}
                className={`${seamless} mt-0.5 resize-none text-[#555555]`}
              />
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email (optional)"
                className={`${seamless} text-[#555555]`}
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
                className={`${seamless} text-[#555555]`}
              />
            </div>
            <div className="flex-1 border-l-4 pl-4" style={{ borderColor: YELLOW }}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#555555]">
                Site Address
              </p>
              <textarea
                value={jobAddress}
                onChange={(e) => setJobAddress(e.target.value)}
                placeholder="Same as billing address"
                rows={3}
                className={`${seamless} resize-none text-[#555555]`}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Used to auto-match bank payments
              </p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-black text-left text-white">
                <th className="px-3 py-2.5 font-bold">Description</th>
                <th className="w-24 px-3 py-2.5 text-right font-bold">Unit Price</th>
                <th className="w-16 px-3 py-2.5 text-right font-bold">Qty</th>
                <th className="w-36 px-3 py-2.5 text-right font-bold">Amount</th>
                <th className="w-20 bg-white"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rowTotal = Math.round(
                  (Number(row.quantity) || 0) * parsePoundsToPence(row.unitPrice)
                );
                const excluded = !row.included;
                return (
                  <tr key={row.key} className={idx % 2 === 1 ? "bg-[#F5F5F5]" : ""}>
                    <td className={`px-2 py-1 ${excluded ? "opacity-40" : ""}`}>
                      <input
                        value={row.description}
                        onChange={(e) => updateRow(row.key, { description: e.target.value })}
                        placeholder="Describe the work…"
                        className={`${seamless} ${excluded ? "line-through" : ""}`}
                      />
                    </td>
                    <td className={`px-2 py-1 ${excluded ? "opacity-40" : ""}`}>
                      <div className="flex items-center justify-end">
                        <span className="text-[#555555]">£</span>
                        <input
                          value={row.unitPrice}
                          onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                          inputMode="decimal"
                          placeholder="0.00"
                          className={`${seamless} w-20 text-right text-[#555555]`}
                        />
                      </div>
                    </td>
                    <td className={`px-2 py-1 ${excluded ? "opacity-40" : ""}`}>
                      <input
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                        inputMode="decimal"
                        className={`${seamless} text-right text-[#555555]`}
                      />
                    </td>
                    <td className={`px-3 py-1 text-right text-[#555555] ${excluded ? "opacity-40 line-through" : ""}`}>
                      {formatPence(rowTotal)}{exclVat}
                    </td>
                    <td className="whitespace-nowrap px-1 py-1 text-right text-xs">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(e) => updateRow(row.key, { included: e.target.checked })}
                        title="Include in totals"
                        className="mr-1 h-3.5 w-3.5 accent-black align-middle"
                      />
                      <button type="button" onClick={() => moveRow(row.key, -1)} disabled={idx === 0}
                        className="px-0.5 text-slate-300 hover:text-black disabled:opacity-20" aria-label="Move up">↑</button>
                      <button type="button" onClick={() => moveRow(row.key, 1)} disabled={idx === rows.length - 1}
                        className="px-0.5 text-slate-300 hover:text-black disabled:opacity-20" aria-label="Move down">↓</button>
                      <button type="button"
                        onClick={() => setRows((prev) => prev.length > 1 ? prev.filter((r) => r.key !== row.key) : prev)}
                        className="px-0.5 text-slate-300 hover:text-red-600" aria-label="Remove line">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="mt-2 rounded border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-black hover:text-black"
          >
            + Add line
          </button>

          {/* Totals */}
          <div className="mt-6">
            {ctx.vatRegistered && (
              <>
                <div className="flex justify-end gap-8 border-t border-[#DDDDDD] py-2 pr-3 text-sm">
                  <span className="text-[#555555]">Subtotal (excl. VAT)</span>
                  <span className="w-28 text-right">{formatPence(totals.subtotalPence)}</span>
                </div>
                <div className="flex justify-end gap-8 border-t border-[#DDDDDD] py-2 pr-3 text-sm">
                  <span className="text-[#555555]">VAT ({ctx.vatRatePercent}%)</span>
                  <span className="w-28 text-right">{formatPence(totals.vatPence)}</span>
                </div>
              </>
            )}
            <div className="mt-1 flex justify-end gap-8 px-3 py-2.5 text-base font-bold" style={{ background: YELLOW }}>
              <span>TOTAL DUE</span>
              <span className="w-28 text-right">{formatPence(totals.totalPence)}</span>
            </div>
          </div>

          {/* Notes + payment details */}
          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:gap-8">
            <div className="flex-[1.2] text-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#555555]">Notes</p>
              <p className="text-[#555555]">Thank you for your business!</p>
              <p className="text-[#555555]">
                Please include your name and invoice number {ctx.numberLabel} as the payment reference.
              </p>
              {ctx.contactEmail && (
                <p className="text-[#555555]">For questions, contact us at {ctx.contactEmail}.</p>
              )}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Extra notes for this invoice (optional)"
                rows={2}
                className={`${seamless} mt-1 resize-none text-[#555555]`}
              />
            </div>
            <div className="flex-1 border-l-4 bg-[#F5F5F5] p-4 text-sm" style={{ borderColor: YELLOW }}>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#555555]">
                Payment Details
              </p>
              <p>Name: {ctx.bankAccountName}</p>
              <p>Account No: {ctx.bankAccountNumber}</p>
              <p>Sort Code: {ctx.bankSortCode}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 border-t-2 pt-3 text-center text-xs text-[#555555]" style={{ borderColor: YELLOW }}>
            Thank you for choosing {ctx.companyName.replace(/\s+LTD$/i, "")}
            {ctx.website ? `  •  ${ctx.website}` : ""}
          </div>
        </div>
      </div>

      {error && (
        <p className="mx-auto mt-4 max-w-3xl text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mx-auto mt-4 max-w-3xl">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
