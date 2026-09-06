import { getSettings } from "@/lib/db";
import { updatePricingSettings } from "@/actions/settings";
import { PricingCalculator } from "@/components/pricing-calculator";
import { penceToPoundsInput } from "@/lib/money";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ saved }, settings] = await Promise.all([searchParams, getSettings()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-800">Pricing</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <PricingCalculator
          rates={{
            calloutFeePence: settings.calloutFeePence,
            hourlyRateWeekdayPence: settings.hourlyRateWeekdayPence,
            hourlyRateOutOfHoursPence: settings.hourlyRateOutOfHoursPence,
            billingIncrementMinutes: settings.billingIncrementMinutes,
            materialsMarkupPercent: settings.materialsMarkupPercent,
            vatRegistered: settings.vatRegistered,
            vatRatePercent: settings.vatRatePercent,
          }}
        />

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Your rates</h2>
          <p className="mb-4 text-xs text-slate-400">
            Seeded with London market reference points — tune them to your business.
          </p>
          {saved && (
            <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Rates saved.
            </p>
          )}
          <form action={updatePricingSettings} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Call-out fee £
              <input name="calloutFee" defaultValue={penceToPoundsInput(settings.calloutFeePence)} inputMode="decimal" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-sm">
              Hourly rate (weekday) £
              <input name="hourlyRateWeekday" defaultValue={penceToPoundsInput(settings.hourlyRateWeekdayPence)} inputMode="decimal" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-sm">
              Hourly rate (out of hours) £
              <input name="hourlyRateOutOfHours" defaultValue={penceToPoundsInput(settings.hourlyRateOutOfHoursPence)} inputMode="decimal" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-sm">
              Day rate £
              <input name="dayRate" defaultValue={penceToPoundsInput(settings.dayRatePence)} inputMode="decimal" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-sm">
              Billing increment (minutes)
              <input name="billingIncrementMinutes" defaultValue={settings.billingIncrementMinutes} inputMode="numeric" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-sm">
              Materials markup %
              <input name="materialsMarkupPercent" defaultValue={settings.materialsMarkupPercent} inputMode="numeric" className={`mt-1 ${inputCls}`} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Save rates
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
