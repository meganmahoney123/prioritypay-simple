// Client-side PDF report generator for the Tax Savings Quiz results, used
// by both the public quiz (app/tax-savings-quiz) and the logged-in quiz
// page (app/(app)/advisor). Runs entirely in the browser via pdf-lib --
// no server round trip -- consistent with the quiz's existing "everything
// stays in your browser" privacy stance (see app/api/quiz/submit/route.js
// and the Advisory Fee Calculator, which make the same promise).
//
// The report is deliberately plain: a title, a persistent "not advice"
// disclaimer, and the same If / You could / The benefit / Sample scenario /
// Not advice structure shown on screen, grouped by category -- meant to be
// handed to a CPA or attorney as a list of discussion starters, not a
// polished marketing document.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.11, 0.09, 0.09);
const MUTED = rgb(0.38, 0.36, 0.34);
const ACCENT = rgb(0.5, 0.38, 0.18);
const DIVIDER = rgb(0.82, 0.8, 0.76);

function wrapText(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Builds the PDF bytes for a quiz report. Pure function, no DOM access,
 * so it's also unit-testable / usable from a future server route if this
 * ever needs to move server-side.
 */
export async function buildQuizReportPdfBytes({ results, generatedAt }) {
  const doc = await PDFDocument.create();
  doc.setTitle("PriorityPay — Tax Savings Report");
  doc.setProducer("PriorityPay");

  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bodyBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  let pageNum = 1;
  const pages = [page];

  function newPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    pageNum += 1;
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(need) {
    if (y - need < MARGIN + 24) newPage();
  }

  function drawWrapped(text, { font = body, size = 10.5, color = INK, gap = 4, maxWidth = CONTENT_WIDTH, x = MARGIN } = {}) {
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      ensureSpace(size + gap);
      page.drawText(line, { x, y: y - size, size, font, color });
      y -= size + gap;
    }
  }

  // ---- Header ----
  page.drawText("PriorityPay", { x: MARGIN, y: y - 20, size: 20, font: bodyBold, color: INK });
  page.drawText("Tax Savings Report", { x: MARGIN, y: y - 40, size: 12, font: body, color: ACCENT });
  y -= 58;
  page.drawText(`Generated ${generatedAt}`, { x: MARGIN, y, size: 9, font: body, color: MUTED });
  y -= 20;

  // ---- Disclaimer box ----
  const discText =
    "This report lists things to research and questions to bring to a licensed CPA or tax attorney. " +
    "It is not tax, legal, or financial advice, is not personalized to your full situation, and none of " +
    "the figures shown (where present) are calculations of your actual numbers.";
  const discLines = wrapText(discText, bodyItalic, 9, CONTENT_WIDTH - 20);
  const discHeight = discLines.length * 13 + 16;
  page.drawRectangle({ x: MARGIN, y: y - discHeight, width: CONTENT_WIDTH, height: discHeight, borderColor: DIVIDER, borderWidth: 1 });
  let discY = y - 12;
  for (const line of discLines) {
    page.drawText(line, { x: MARGIN + 10, y: discY - 9, size: 9, font: bodyItalic, color: MUTED });
    discY -= 13;
  }
  y -= discHeight + 24;

  // ---- Categories / strategies ----
  for (const group of results) {
    ensureSpace(30);
    page.drawText(group.category, { x: MARGIN, y: y - 14, size: 14, font: bodyBold, color: INK });
    y -= 24;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.75, color: DIVIDER });
    y -= 14;

    for (const s of group.strategies) {
      ensureSpace(40);
      drawWrapped(s.title, { font: bodyBold, size: 12, color: INK, gap: 6 });

      if (s.condition) drawWrapped(`If: ${s.condition}`, { size: 10, color: INK });
      if (s.action) drawWrapped(`You could: ${s.action}`, { font: bodyBold, size: 10, color: INK });
      if (s.benefit) drawWrapped(`The benefit: ${s.benefit}`, { size: 10, color: INK });
      if (s.scenario) drawWrapped(`Sample scenario: ${s.scenario}`, { font: bodyItalic, size: 9.5, color: MUTED });
      if (s.notFinancialAdviceNote) drawWrapped(`Not advice: ${s.notFinancialAdviceNote}`, { font: bodyItalic, size: 9, color: MUTED });

      y -= 10;
      ensureSpace(1);
      page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.5, color: DIVIDER });
      y -= 14;
    }
    y -= 6;
  }

  // ---- Footer on every page ----
  pages.forEach((p, i) => {
    p.drawText(
      `PriorityPay — Tax Savings Report — general educational information, not tax, legal, or financial advice.`,
      { x: MARGIN, y: 28, size: 7.5, font: body, color: MUTED }
    );
    p.drawText(`Page ${i + 1} of ${pages.length}`, { x: PAGE_WIDTH - MARGIN - 60, y: 28, size: 7.5, font: body, color: MUTED });
  });

  return doc.save();
}

/** Browser-only: builds the PDF and triggers a download. */
export async function downloadQuizReportPdf({ results }) {
  const generatedAt = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const bytes = await buildQuizReportPdfBytes({ results, generatedAt });
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prioritypay-tax-savings-report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
