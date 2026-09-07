import { chromium } from "playwright";

// Chromium must only ever be launched from API routes / server code, never
// bundled into components. CHROMIUM_EXECUTABLE_PATH overrides the binary
// (useful when a system Chromium is provided instead of Playwright's own).
// Hard timeouts everywhere: on a memory-starved container a hung launch
// otherwise leaves the request (and the user's tab) hanging forever.
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  console.log("[pdf] launching chromium", {
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "(playwright default)",
    browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || "(default)",
  });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
    ],
    timeout: 45_000,
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30_000);
    // The HTML is self-contained (inline CSS, data-URI logo) so plain "load"
    // is enough; "networkidle" can stall on constrained containers.
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    console.log(`[pdf] rendered ${pdf.length} bytes`);
    return pdf;
  } finally {
    await browser.close().catch(() => {});
  }
}
