// Smoke test for the PDF render path: launches Chromium headlessly, renders a
// sample invoice-like page, and checks a real PDF comes back.
import { chromium } from "playwright";

const html = `<!DOCTYPE html><html><head><style>@page{size:A4;margin:18mm}</style></head>
<body><h1>INV-0001</h1><table><tr><td>Replace kitchen tap</td><td>£110.00</td></tr></table>
<p>Total due: £132.00</p></body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  const header = Buffer.from(pdf.slice(0, 5)).toString("latin1");
  if (header !== "%PDF-") {
    throw new Error(`Output is not a PDF (starts with ${JSON.stringify(header)})`);
  }
  console.log(`PDF smoke test passed — ${pdf.length} bytes, header ${header}`);
} finally {
  await browser.close();
}
