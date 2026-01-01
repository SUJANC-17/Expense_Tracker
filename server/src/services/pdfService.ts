import PDFDocument from 'pdfkit';

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

const COLORS = {
    primary: '#4f46e5', // Indigo 600
    secondary: '#6366f1', // Indigo 500
    text: '#1e293b', // Slate 800
    textLight: '#64748b', // Slate 500
    success: '#10b981', // Emerald 500
    danger: '#ef4444', // Red 500
    warning: '#f59e0b', // Amber 500
    background: '#f8fafc', // Slate 50
    border: '#e2e8f0', // Slate 200
    white: '#ffffff'
};

export const generateMonthlyPDF = (data: MonthlyData): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // --- Header ---
        doc
            .rect(0, 0, doc.page.width, 120)
            .fill(COLORS.primary);

        doc
            .fillColor(COLORS.white)
            .fontSize(28)
            .font('Helvetica-Bold')
            .text('Expense Report', 50, 45)
            .fontSize(14)
            .font('Helvetica')
            .text(`${getMonthName(data.month)} ${data.year}`, 50, 80);

        doc
            .fontSize(10)
            .text('Generated for:', doc.page.width - 250, 55, { align: 'right', width: 200 })
            .font('Helvetica-Bold')
            .text(data.user_email, doc.page.width - 250, 70, { align: 'right', width: 200 });

        doc.y = 150;

        // --- Summary Section ---
        doc
            .fillColor(COLORS.text)
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('Financial Summary', 50, doc.y)
            .moveDown(0.8);

        const summaryY = doc.y;
        const boxWidth = 160;
        const boxGap = 15;

        // Income Card
        drawCard(doc, 50, summaryY, boxWidth, 90, 'TOTAL INCOME', `Rs.${data.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, COLORS.success);

        // Expense Card
        drawCard(doc, 50 + boxWidth + boxGap, summaryY, boxWidth, 90, 'TOTAL EXPENSE', `Rs.${data.total_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, COLORS.danger);

        // Balance Card
        const balanceColor = data.balance >= 0 ? COLORS.primary : COLORS.warning;
        drawCard(doc, 50 + (boxWidth + boxGap) * 2, summaryY, boxWidth, 90, 'NET BALANCE', `Rs.${data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, balanceColor);

        doc.y = summaryY + 120;

        // --- Category Breakdown ---
        if (data.expenses_by_category.length > 0) {
            checkPageBreak(doc, 150);
            doc
                .fillColor(COLORS.text)
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('Expenses by Category', 50, doc.y)
                .moveDown(0.5);

            const catHeaders = ['Category', 'Percentage', 'Total Amount'];
            const catRows = data.expenses_by_category.map(cat => [
                cat.category,
                `${((cat.total / data.total_expense) * 100).toFixed(1)}%`,
                `Rs.${cat.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ]);

            drawTable(doc, catHeaders, catRows, [195, 100, 195]);
            doc.moveDown(1);
        }

        // --- Income Details ---
        if (data.incomes && data.incomes.length > 0) {
            checkPageBreak(doc, 150);
            doc
                .fillColor(COLORS.text)
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('Income Transactions', 50, doc.y)
                .moveDown(0.5);

            const headers = ['Date', 'Source', 'Description', 'Amount'];
            const rows = data.incomes.map(item => [
                formatDate(item.date),
                item.source,
                item.description || '-',
                `Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ]);

            drawTable(doc, headers, rows, [75, 115, 200, 100], COLORS.success);
            doc.moveDown(1);
        }

        // --- Expense Details ---
        if (data.expenses && data.expenses.length > 0) {
            checkPageBreak(doc, 150);
            doc
                .fillColor(COLORS.text)
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('Expense Transactions', 50, doc.y)
                .moveDown(0.5);

            const headers = ['Date', 'Category', 'Description', 'Amount'];
            const rows = data.expenses.map(item => [
                formatDate(item.date),
                item.category,
                item.description || '-',
                `Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ]);

            drawTable(doc, headers, rows, [75, 115, 200, 100], COLORS.danger);
            doc.moveDown(1);
        }

        // --- Unpaid Splits ---
        if (data.unpaid_splits && data.unpaid_splits.length > 0) {
            checkPageBreak(doc, 150);
            doc
                .fillColor(COLORS.text)
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('Unpaid Split Expenses', 50, doc.y)
                .moveDown(0.2);

            doc
                .fillColor(COLORS.danger)
                .fontSize(10)
                .font('Helvetica')
                .text(`Pending Recovery Total: Rs.${data.total_unpaid_splits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
                .moveDown(0.8);

            const headers = ['Date', 'Friend', 'Description', 'Amount'];
            const rows = data.unpaid_splits.map(item => [
                formatDate(item.date),
                item.friend_name,
                item.description || '-',
                `Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ]);

            drawTable(doc, headers, rows, [75, 115, 200, 100], COLORS.warning);
            doc.moveDown(1);
        }

        // Add page numbers
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc
                .fillColor(COLORS.textLight)
                .fontSize(8)
                .font('Helvetica')
                .text(
                    `Page ${i + 1} of ${range.count}  |  Expense Tracker App  |  Generated on ${new Date().toLocaleDateString()}`,
                    0,
                    doc.page.height - 40,
                    { align: 'center' }
                );
        }

        doc.end();
    });
};

function drawCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, label: string, value: string, accentColor: string) {
    doc
        .roundedRect(x, y, width, height, 8)
        .fillColor(COLORS.white)
        .fillAndStroke(COLORS.border, COLORS.border);

    doc
        .rect(x, y, 4, height)
        .fill(accentColor);

    doc
        .fillColor(COLORS.textLight)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(label, x + 15, y + 20);

    doc
        .fillColor(COLORS.text)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(value, x + 15, y + 40, { width: width - 25 });
}

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths: number[], accentColor: string = COLORS.primary) {
    const startX = 50;
    const headerHeight = 30;
    const rowHeight = 30;

    // Header
    doc
        .rect(startX, doc.y, colWidths.reduce((a, b) => a + b, 0), headerHeight)
        .fill(COLORS.background);

    doc.rect(startX, doc.y, colWidths.reduce((a, b) => a + b, 0), 1).fill(accentColor);

    let currentX = startX;
    doc.fillColor(COLORS.text).fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
        doc.text(header, currentX + 5, doc.y + 10, { width: (colWidths[i] || 0) - 10, align: 'left' });
        currentX += (colWidths[i] || 0);
    });

    doc.y += headerHeight;

    // Rows
    doc.font('Helvetica').fontSize(9);
    rows.forEach((row, rowIndex) => {
        checkPageBreak(doc, rowHeight);

        const rowY = doc.y;
        if (rowIndex % 2 === 0) {
            doc.rect(startX, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#ffffff');
        } else {
            doc.rect(startX, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#fcfcfc');
        }

        currentX = startX;
        doc.fillColor(COLORS.text);
        row.forEach((cell, i) => {
            const isAmount = cell.startsWith('Rs.');
            doc.text(cell, currentX + 5, rowY + 8, {
                width: (colWidths[i] || 0) - 10,
                align: isAmount ? 'right' : 'left',
                lineBreak: false,
                ellipsis: true
            });
            currentX += (colWidths[i] || 0);
        });

        doc.y = rowY + rowHeight;

        // Horizontal line
        doc.rect(startX, doc.y, colWidths.reduce((a, b) => a + b, 0), 0.5).fill(COLORS.border);
    });
}

function checkPageBreak(doc: PDFKit.PDFDocument, neededHeight: number) {
    if (doc.y + neededHeight > doc.page.height - 70) {
        doc.addPage();
        // Redraw header background on new page if needed (skipped for content pages for cleaner look)
    }
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function getMonthName(month: number): string {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
}
