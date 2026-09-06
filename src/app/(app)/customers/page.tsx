import { prisma } from "@/lib/db";
import { createCustomer } from "@/actions/customers";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-brand-800">Customers</h1>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-right">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No customers yet — add one on the right.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {[c.addressLine1, c.city, c.postcode].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{c._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-6 text-lg font-semibold">Add customer</h2>
        <form action={createCustomer} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <input name="name" placeholder="Name *" required className={inputCls} />
          <input name="email" type="email" placeholder="Email" className={inputCls} />
          <input name="phone" placeholder="Phone" className={inputCls} />
          <input name="addressLine1" placeholder="Address line 1" className={inputCls} />
          <input name="addressLine2" placeholder="Address line 2" className={inputCls} />
          <div className="flex gap-3">
            <input name="city" placeholder="City" className={inputCls} />
            <input name="postcode" placeholder="Postcode" className={inputCls} />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Add customer
          </button>
        </form>
      </div>
    </div>
  );
}
