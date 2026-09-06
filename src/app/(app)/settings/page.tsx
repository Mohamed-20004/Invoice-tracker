import { getSettings } from "@/lib/db";
import { updateCompanySettings } from "@/actions/settings";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ saved }, settings] = await Promise.all([searchParams, getSettings()]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-brand-800">Company settings</h1>
      <p className="text-sm text-slate-500">
        These details appear on every invoice. UK limited companies must show the
        registered name, company number, registered office, and place of
        registration; VAT-registered companies must also show the VAT number.
      </p>
      {saved && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Settings saved.
        </p>
      )}
      <form action={updateCompanySettings} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <label className="block text-sm">
          Registered company name
          <input name="companyName" defaultValue={settings.companyName} className={`mt-1 ${inputCls}`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Company number
            <input name="companyNumber" defaultValue={settings.companyNumber} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm">
            Place of registration
            <input name="placeOfRegistration" defaultValue={settings.placeOfRegistration} className={`mt-1 ${inputCls}`} />
          </label>
        </div>
        <label className="block text-sm">
          Registered office address
          <input name="registeredAddress" defaultValue={settings.registeredAddress} className={`mt-1 ${inputCls}`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Contact email
            <input name="contactEmail" type="email" defaultValue={settings.contactEmail} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-sm">
            Contact phone
            <input name="contactPhone" defaultValue={settings.contactPhone} className={`mt-1 ${inputCls}`} />
          </label>
        </div>
        <label className="block text-sm">
          Website (shown in the invoice footer)
          <input name="website" defaultValue={settings.website} className={`mt-1 ${inputCls}`} />
        </label>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold">VAT</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="vatRegistered"
              defaultChecked={settings.vatRegistered}
              className="h-4 w-4 accent-brand-700"
            />
            VAT registered
          </label>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              VAT number
              <input name="vatNumber" defaultValue={settings.vatNumber} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              VAT rate %
              <input name="vatRatePercent" defaultValue={settings.vatRatePercent} inputMode="numeric" className={`mt-1 ${inputCls}`} />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold">Bank details (shown on invoices)</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              Account name
              <input name="bankAccountName" defaultValue={settings.bankAccountName} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              Sort code
              <input name="bankSortCode" defaultValue={settings.bankSortCode} placeholder="00-00-00" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-sm">
              Account number
              <input name="bankAccountNumber" defaultValue={settings.bankAccountNumber} className={`mt-1 ${inputCls}`} />
            </label>
          </div>
        </fieldset>

        <label className="block text-sm sm:w-1/2">
          Payment terms (days)
          <input name="paymentTermsDays" defaultValue={settings.paymentTermsDays} inputMode="numeric" className={`mt-1 ${inputCls}`} />
        </label>

        <button
          type="submit"
          className="rounded-md bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
