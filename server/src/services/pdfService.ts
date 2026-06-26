import PDFDocumentLib from 'pdfkit-table';
const PDFDocument = (PDFDocumentLib as any).default || PDFDocumentLib;

interface MonthlyData {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  balance: number;
  expenses_by_category: Array<{ category: string; total: number }>;
  total_unpaid_splits: number;
  user_email: string;
  incomes: Array<{ amount: number; source: string; description: string; date: string }>;
  expenses: Array<{ amount: number; category: string; description: string; date: string }>;
  unpaid_splits: Array<{ friend_name: string; amount: number; description: string; date: string }>;
}

// ─── Corporate Color Palette ───────────────────────────────────────────────
const C = {
  headerBg:     '#1a2340',
  headerText:   '#ffffff',
  accentBlue:   '#2563eb',
  accentGold:   '#b8960c',
  sectionTitle: '#1a2340',
  text:         '#1e293b',
  textMuted:    '#64748b',
  divider:      '#cbd5e1',
  success:      '#15803d',
  danger:       '#b91c1c',
  white:        '#ffffff',
};

const PAGE_H = 841.89;
const PAGE_W = 595.28;
const MARGIN  = 50;
const FOOTER_SAFE = PAGE_H - 60;

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function getMonthName(month: number): string {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][month - 1] || '';
}

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function drawSummaryCard(
  doc: any,
  x: number, y: number,
  width: number, height: number,
  label: string, value: string,
  accentColor: string
) {
  doc.roundedRect(x + 2, y + 2, width, height, 4).fillColor('#d1d5db').fill();
  doc.roundedRect(x, y, width, height, 4).fillColor(C.white).fill();
  doc.rect(x, y, width, 5).fillColor(accentColor).fill();
  doc.rect(x, y + 5, 2, height - 5).fillColor(accentColor).fill();

  doc
    .fillColor(C.textMuted)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text(label.toUpperCase(), x + 12, y + 14, { width: width - 16, lineBreak: false });

  doc
    .fillColor(C.text)
    .fontSize(13)
    .font('Helvetica-Bold')
    .text(value, x + 12, y + 30, { width: width - 16, lineBreak: false });
}

function drawSectionHeading(doc: any, title: string, y: number): number {
  if (y + 60 > FOOTER_SAFE) {
    doc.addPage();
    y = MARGIN;
  }

  doc.rect(MARGIN, y, 4, 18).fillColor(C.accentBlue).fill();

  doc
    .fillColor(C.sectionTitle)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(title, MARGIN + 14, y + 3, { lineBreak: false });

  doc
    .moveTo(MARGIN, y + 22)
    .lineTo(PAGE_W - MARGIN, y + 22)
    .strokeColor(C.divider)
    .lineWidth(0.5)
    .stroke();

  const nextY = y + 34;
  doc.y = nextY;
  return nextY;
}

function drawFooter(doc: any, pageIndex: number, totalPages: number, month: number, year: number) {
  doc
    .moveTo(MARGIN, PAGE_H - 45)
    .lineTo(PAGE_W - MARGIN, PAGE_H - 45)
    .strokeColor(C.accentGold)
    .lineWidth(1)
    .stroke();

  doc
    .fillColor(C.textMuted)
    .fontSize(7.5)
    .font('Helvetica')
    .text(
      `EXPENSE TRACKER  |  Monthly Report — ${getMonthName(month)} ${year}`,
      MARGIN, PAGE_H - 32,
      { width: 300, lineBreak: false }
    );

  doc
    .fillColor(C.textMuted)
    .fontSize(7.5)
    .font('Helvetica')
    .text(
      `Page ${pageIndex + 1} of ${totalPages}`,
      PAGE_W - MARGIN - 150, PAGE_H - 32,
      { width: 150, align: 'right', lineBreak: false }
    );
}

// ─── Main Export ───────────────────────────────────────────────────────────
export const generateMonthlyPDF = async (data: MonthlyData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: MARGIN,
      size: 'A4',
      bufferPages: true,
      layout: 'portrait',
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, PAGE_W, 110).fillColor(C.headerBg).fill();
    doc.rect(0, 108, PAGE_W, 3).fillColor(C.accentGold).fill();

    doc
      .fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text('EXPENSE TRACKER', MARGIN, 18, { characterSpacing: 2, lineBreak: false });

    doc
      .fillColor(C.headerText).fontSize(22).font('Helvetica-Bold')
      .text('Monthly Financial Report', MARGIN, 34, { lineBreak: false });

    doc
      .fillColor('#93c5fd').fontSize(11).font('Helvetica')
      .text(`${getMonthName(data.month)} ${data.year}`, MARGIN, 62, { lineBreak: false });

    doc
      .fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text('PREPARED FOR', PAGE_W - 200, 28, { width: 150, align: 'right', lineBreak: false });

    doc
      .fillColor(C.headerText).fontSize(9.5).font('Helvetica-Bold')
      .text(data.user_email, PAGE_W - 200, 44, { width: 150, align: 'right', lineBreak: false });

    doc
      .fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text(
        `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        PAGE_W - 200, 62,
        { width: 150, align: 'right', lineBreak: false }
      );

    const cardW = 152;
    const cardH = 72;
    const gap   = 12;
    const cardY = 128;

    drawSummaryCard(doc, MARGIN,                    cardY, cardW, cardH, 'Total Income',   formatRs(data.total_income),  C.success);
    drawSummaryCard(doc, MARGIN + cardW + gap,      cardY, cardW, cardH, 'Total Expenses', formatRs(data.total_expense), C.danger);
    drawSummaryCard(doc, MARGIN + (cardW + gap) * 2, cardY, cardW, cardH, 'Net Balance',    formatRs(data.balance),       data.balance >= 0 ? C.success : C.danger);

    doc.y = cardY + cardH + 24;

    const tableOptions = {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9),
      prepareRow:    () => doc.font('Helvetica').fontSize(8.5),
      padding:       5,
      columnSpacing: 4,
      bottomMargin:  60,
    };

    const runTables = async () => {
      try {
        if (data.expenses_by_category?.length > 0) {
          drawSectionHeading(doc, 'Expenses by Category', doc.y);

          await doc.table({
            headers: [
              { label: 'Category',  property: 'category',   width: 220 },
              { label: 'Share (%)', property: 'percentage', width: 120 },
              { label: 'Amount',    property: 'total',      width: 130 },
            ],
            rows: data.expenses_by_category.map((cat) => [
              cat.category,
              data.total_expense > 0 ? `${((cat.total / data.total_expense) * 100).toFixed(1)}%` : '0.0%',
              formatRs(cat.total),
            ]),
          }, tableOptions);
        }

        if (data.incomes?.length > 0) {
          if (doc.y + 60 < FOOTER_SAFE) doc.y += 16;
          drawSectionHeading(doc, 'Income Entries', doc.y);

          await doc.table({
            headers: [
              { label: 'Date',        property: 'date',        width: 80 },
              { label: 'Source',      property: 'source',      width: 130 },
              { label: 'Description', property: 'description', width: 175 },
              { label: 'Amount',      property: 'amount',      width: 110 },
            ],
            rows: data.incomes.map((item) => [
              formatDate(item.date),
              item.source,
              item.description || '—',
              formatRs(item.amount),
            ]),
          }, tableOptions);
        }

        if (data.expenses?.length > 0) {
          if (doc.y + 60 < FOOTER_SAFE) doc.y += 16;
          drawSectionHeading(doc, 'Expense Entries', doc.y);

          await doc.table({
            headers: [
              { label: 'Date',        property: 'date',        width: 80 },
              { label: 'Category',    property: 'category',    width: 130 },
              { label: 'Description', property: 'description', width: 175 },
              { label: 'Amount',      property: 'amount',      width: 110 },
            ],
            rows: data.expenses.map((item) => [
              formatDate(item.date),
              item.category,
              item.description || '—',
              formatRs(item.amount),
            ]),
          }, tableOptions);
        }

        if (data.unpaid_splits?.length > 0) {
          if (doc.y + 60 < FOOTER_SAFE) doc.y += 16;
          drawSectionHeading(doc,
            `Pending Split Balances  —  Total: ${formatRs(data.total_unpaid_splits)}`,
            doc.y
          );

          await doc.table({
            headers: [
              { label: 'Date',        property: 'date',        width: 80 },
              { label: 'Friend',      property: 'friend',      width: 130 },
              { label: 'Description', property: 'description', width: 175 },
              { label: 'Amount',      property: 'amount',      width: 110 },
            ],
            rows: data.unpaid_splits.map((item) => [
              formatDate(item.date),
              item.friend_name,
              item.description || '—',
              formatRs(item.amount),
            ]),
          }, tableOptions);
        }

        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          drawFooter(doc, i - range.start, range.count, data.month, data.year);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    };

    runTables();
  });
};
