import re

with open('src/utils/pdfGenerator.ts', 'r', encoding='utf-8') as f:
    code = f.read()

new_func = """
export async function generateFinancialStatementPDF(
  summary: any,
  startDate: string,
  endDate: string
) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MK Enterprises', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Financial Statement', pageWidth / 2, 30, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let dateText = 'For all time';
  if (startDate && endDate) dateText = `For the period: ${startDate} to ${endDate}`;
  else if (startDate) dateText = `From ${startDate}`;
  else if (endDate) dateText = `Up to ${endDate}`;
  doc.text(dateText, pageWidth / 2, 38, { align: 'center' });

  // Income Statement
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Statement (Profit & Loss)', 14, 55);

  autoTable(doc, {
    startY: 60,
    head: [['Description', 'Amount (Rs)']],
    body: [
      ['Total Revenue', summary.total_revenue.toLocaleString()],
      ['Total Expenses', summary.total_expenses.toLocaleString()],
    ],
    foot: [
      ['Net Profit', summary.net_profit.toLocaleString()]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  // Balance Sheet
  let finalY = (doc as any).lastAutoTable.finalY || 60;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Balance Sheet', 14, finalY + 15);

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Assets', 'Amount (Rs)', 'Liabilities & Equity', 'Amount (Rs)']],
    body: [
      ['Total Assets', summary.total_assets.toLocaleString(), 'Total Liabilities', summary.total_liabilities.toLocaleString()],
      ['', '', 'Total Equity (incl. Net Profit)', summary.total_equity.toLocaleString()],
    ],
    foot: [
      ['Total', summary.total_assets.toLocaleString(), 'Total', (summary.total_liabilities + summary.total_equity).toLocaleString()]
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });
  
  const generatedAt = new Date().toLocaleString();
  finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated automatically by Business Management System on ${generatedAt}`, 14, finalY + 20);

  const safeDate = new Date().toISOString().split('T')[0];
  await savePdf(doc, `Financial_Statement_${safeDate}.pdf`, 'Financial Statement');
}
"""

code = code + new_func

with open('src/utils/pdfGenerator.ts', 'w', encoding='utf-8') as f:
    f.write(code)
