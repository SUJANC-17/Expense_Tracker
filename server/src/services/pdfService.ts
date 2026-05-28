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

function drawCard(doc: any, x: number, y: number, width: number, height: number, label: string, value: string, accentColor: string) {
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

export const generateMonthlyPDF = async (data: MonthlyData): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
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
        const boxWidth = 150;
        const boxGap = 15;

        // Cards
        drawCard(doc, 50, summaryY, boxWidth, 80, 'TOTAL INCOME', `Rs.${data.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, COLORS.success);
        drawCard(doc, 50 + boxWidth + boxGap, summaryY, boxWidth, 80, 'TOTAL EXPENSE', `Rs.${data.total_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, COLORS.danger);
        
        const balanceColor = data.balance >= 0 ? COLORS.primary : COLORS.warning;
        drawCard(doc, 50 + (boxWidth + boxGap) * 2, summaryY, boxWidth, 80, 'NET BALANCE', `Rs.${data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, balanceColor);

        doc.y = summaryY + 110;

        // Helper to run async tables
        const runTables = async () => {
            try {
                // --- Category Breakdown ---
                if (data.expenses_by_category && data.expenses_by_category.length > 0) {
                    doc.moveDown(2);
                    const catTable = {
                        title: "Expenses by Category",
                        headers: [
                            { label: "Category", property: "category", width: 200, renderer: null },
                            { label: "Percentage", property: "percentage", width: 100, renderer: null },
                            { label: "Total Amount", property: "total", width: 150, renderer: null }
                        ],
                        rows: data.expenses_by_category.map(cat => [
                            cat.category,
                            `${((cat.total / data.total_expense) * 100).toFixed(1)}%`,
                            `Rs.${cat.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        ])
                    };
                    await doc.table(catTable, { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10), prepareRow: () => doc.font("Helvetica").fontSize(9) });
                }

                // --- Income Details ---
                if (data.incomes && data.incomes.length > 0) {
                    doc.moveDown(2);
                    const incTable = {
                        title: "Income Transactions",
                        headers: [
                            { label: "Date", property: "date", width: 80, renderer: null },
                            { label: "Source", property: "source", width: 120, renderer: null },
                            { label: "Description", property: "description", width: 150, renderer: null },
                            { label: "Amount", property: "amount", width: 100, renderer: null }
                        ],
                        rows: data.incomes.map(item => [
                            formatDate(item.date),
                            item.source,
                            item.description || '-',
                            `Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        ])
                    };
                    await doc.table(incTable, { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10), prepareRow: () => doc.font("Helvetica").fontSize(9) });
                }

                // --- Expense Details ---
                if (data.expenses && data.expenses.length > 0) {
                    doc.moveDown(2);
                    const expTable = {
                        title: "Expense Transactions",
                        headers: [
                            { label: "Date", property: "date", width: 80, renderer: null },
                            { label: "Category", property: "category", width: 120, renderer: null },
                            { label: "Description", property: "description", width: 150, renderer: null },
                            { label: "Amount", property: "amount", width: 100, renderer: null }
                        ],
                        rows: data.expenses.map(item => [
                            formatDate(item.date),
                            item.category,
                            item.description || '-',
                            `Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        ])
                    };
                    await doc.table(expTable, { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10), prepareRow: () => doc.font("Helvetica").fontSize(9) });
                }

                // --- Unpaid Splits ---
                if (data.unpaid_splits && data.unpaid_splits.length > 0) {
                    doc.moveDown(2);
                    const splitTable = {
                        title: `Unpaid Split Expenses (Total Pending: Rs.${data.total_unpaid_splits.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`,
                        headers: [
                            { label: "Date", property: "date", width: 80, renderer: null },
                            { label: "Friend", property: "friend", width: 120, renderer: null },
                            { label: "Description", property: "description", width: 150, renderer: null },
                            { label: "Amount", property: "amount", width: 100, renderer: null }
                        ],
                        rows: data.unpaid_splits.map(item => [
                            formatDate(item.date),
                            item.friend_name,
                            item.description || '-',
                            `Rs.${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        ])
                    };
                    await doc.table(splitTable, { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10), prepareRow: () => doc.font("Helvetica").fontSize(9) });
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
            } catch (err) {
                reject(err);
            }
        };

        runTables();
    });
};
