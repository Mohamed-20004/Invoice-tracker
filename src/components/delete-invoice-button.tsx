"use client";

import { useTransition } from "react";
import { deleteInvoice } from "@/actions/invoices";

export function DeleteInvoiceButton({
  invoiceId,
  label,
}: {
  invoiceId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `Delete ${label} permanently?\n\nThis cannot be undone, and deleting an issued invoice leaves a gap in your invoice numbering (HMRC prefers voiding instead). Any matched bank payment is kept but unlinked.`
    );
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteInvoice(invoiceId);
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        window.alert("Failed to delete the invoice.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
      aria-label={`Delete ${label}`}
    >
      <span className="sm:hidden" aria-hidden>{pending ? "…" : "✕"}</span>
      <span className="hidden sm:inline">{pending ? "Deleting…" : "Delete"}</span>
    </button>
  );
}
