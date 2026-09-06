import { chromium } from "playwright";

// Chromium must only ever be launched from API routes / server code, never
// bundled into components. CHROMIUM_EXECUTABLE_PATH overrides the binary
// (useful when a system Chromium is provided instead of Playwright's own).
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}
