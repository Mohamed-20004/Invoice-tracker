"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteInvoice } from "@/actions/invoices";

// Two-step inline confirmation instead of window.confirm: the first tap arms
// the button (clear visual feedback on touch devices), the second deletes.
// Arming times out after a few seconds. Tap targets are >=44px for mobile.
export function DeleteInvoiceButton({
  invoiceId,
  label,
}: {
  invoiceId: string;
  label: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function arm() {
    setArmed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setArmed(false), 5000);
  }

  function confirmDelete() {
    if (timer.current) clearTimeout(timer.current);
    startTransition(async () => {
      try {
        await deleteInvoice(invoiceId);
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        setArmed(false);
        window.alert("Failed to delete the invoice.");
      }
    });
  }

  if (pending) {
    return (
      <span className="inline-flex min-h-11 items-center px-2 text-sm text-slate-400">
        Deleting…
      </span>
    );
  }

  if (armed) {
    // Stacked so the pair never widens the row off-screen on phones.
    return (
      <span className="inline-flex flex-col items-stretch gap-1">
        <button
          type="button"
          onClick={confirmDelete}
          className="min-h-10 rounded-md bg-red-600 px-3 text-sm font-semibold text-white active:bg-red-700"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          aria-label="Cancel delete"
          className="min-h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-500 active:bg-slate-100"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={arm}
      aria-label={`Delete ${label}`}
      className="min-h-11 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-500 active:bg-red-50 active:text-red-600 sm:hover:border-red-300 sm:hover:text-red-600"
    >
      Delete
    </button>
  );
}
