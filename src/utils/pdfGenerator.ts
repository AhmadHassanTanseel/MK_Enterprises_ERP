import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';
import React from 'react';
import { InvoiceLine, Product, Account } from '../app/context/AppContext';


async function savePdf(doc: jsPDF, defaultFileName: string, documentName: string) {
  try {
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    });

    if (!filePath) {
      return; // User cancelled
    }

    const arrayBuffer = doc.output('arraybuffer');
    await writeFile(filePath, new Uint8Array(arrayBuffer));
    
    toast((t) => React.createElement('div', { className: 'flex flex-col gap-2' },
      React.createElement('span', null, `${documentName} exported to PDF`),
      React.createElement('span', { className: 'text-xs text-slate-500 break-all' }, filePath),
      React.createElement('div', { className: 'flex gap-2 mt-2' },
        React.createElement('button', {
          onClick: () => { open(filePath); toast.dismiss(t.id); },
          className: 'px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700'
        }, 'Open File'),
        React.createElement('button', {
          onClick: () => toast.dismiss(t.id),
          className: 'px-3 py-1 bg-slate-200 text-slate-800 rounded text-xs hover:bg-slate-300'
        }, 'Dismiss')
      )
    ), { duration: 8000 });
  } catch (err: any) {
    toast.error(`PDF export failed: ${err.message || err.toString()}`);
  }
}

export const generateInvoicePDF = async (
  invoiceType: 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN',
  refNo: string,
  date: string,
  account: Account | undefined,
  lines: InvoiceLine[],
  products: Product[],
  grossAmount: number,
  discountAmount: number,
  netAmount: number,
  amountPaid: number
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('MK Enterprises', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Business Accounting & Inventory System', 14, 30);
  
  // Invoice Title
  doc.setFontSize(16);
  doc.setTextColor(0);
  const title = invoiceType === 'SALE' ? 'Sale Invoice' :
                invoiceType === 'PURCHASE' ? 'Purchase Invoice' :
                invoiceType === 'SALE_RETURN' ? 'Sale Return (Credit Note)' : 'Purchase Return (Debit Note)';
  doc.text(title, 140, 22);
  
  // Metadata
  doc.setFontSize(10);
  doc.text(`Invoice #: ${refNo}`, 140, 30);
  doc.text(`Date: ${date}`, 140, 36);

  // Customer/Supplier Info
  doc.text('Billed To:', 14, 45);
  doc.setFont('helvetica', 'bold');
  doc.text(account ? account.name : 'Walk-in / Cash', 14, 51);
  doc.setFont('helvetica', 'normal');
  
  // Table
  const tableData = lines.map((line, index) => {
    const product = products.find(p => p.id === line.product_id);
    const gross = line.qty * line.rate;
    const net = gross - (gross * (line.discount_pct / 100));
    return [
      index + 1,
      product ? product.name : 'Unknown Product',
      line.qty,
      line.rate.toFixed(2),
      gross.toFixed(2),
      `${line.discount_pct}%`,
      net.toFixed(2)
    ];
  });

  autoTable(doc, {
    startY: 60,
    head: [['#', 'Item', 'Qty', 'Rate', 'Gross', 'Disc %', 'Net Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  
  doc.text(`Gross Amount: Rs. ${grossAmount.toFixed(2)}`, 140, finalY + 10);
  doc.text(`Discount: Rs. ${discountAmount.toFixed(2)}`, 140, finalY + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Total: Rs. ${netAmount.toFixed(2)}`, 140, finalY + 22);
  doc.setFont('helvetica', 'normal');
  
  if (invoiceType === 'SALE' || invoiceType === 'PURCHASE') {
      doc.text(`${invoiceType === 'SALE' ? 'Received' : 'Paid'}: Rs. ${amountPaid.toFixed(2)}`, 140, finalY + 28);
      const balance = netAmount - amountPaid;
      doc.text(`Balance: Rs. ${balance.toFixed(2)}`, 140, finalY + 34);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('System Generated Document', 14, doc.internal.pageSize.getHeight() - 10);

  await savePdf(doc, `${refNo}.pdf`, 'Document');
};

export const generateReportPDF = async (
  reportType: string,
  entries: any[],
  accounts: Account[],
  fromDate: string,
  toDate: string
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('MK Enterprises', 14, 22);
  
  doc.setFontSize(14);
  const title = reportType === 'LEDGER' ? 'General Ledger Report' : reportType === 'CASHBOOK' ? 'Cash Book' : 'Trial Balance';
  doc.text(title, 14, 30);
  
  doc.setFontSize(10);
  doc.text(`Period: ${fromDate} to ${toDate}`, 14, 36);

  const tableData = entries.map(e => {
    const account = accounts.find(a => a.id === e.account_id);
    return [
      e.date,
      account ? account.name : `ID: ${e.account_id}`,
      e.description || '',
      e.dr_amount > 0 ? e.dr_amount.toFixed(2) : '-',
      e.cr_amount > 0 ? e.cr_amount.toFixed(2) : '-'
    ];
  });

  const totalDebit = entries.reduce((sum, e) => sum + e.dr_amount, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.cr_amount, 0);

  tableData.push([
    '',
    '',
    'TOTALS',
    totalDebit.toFixed(2),
    totalCredit.toFixed(2)
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Date', 'Account', 'Description', 'Debit', 'Credit']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  await savePdf(doc, `${reportType}_Report_${fromDate}_to_${toDate}.pdf`, 'Document');
};


export const generateVoucherPDF = async (
  voucherType: 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'JOURNAL_VOUCHER',
  refNo: string,
  date: string,
  accountName: string,
  amount: number,
  description: string
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('MK Enterprises', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Business Accounting & Inventory System', 14, 30);
  
  // Voucher Title
  doc.setFontSize(16);
  doc.setTextColor(0);
  const title = voucherType === 'CASH_RECEIPT' ? 'Cash Receipt Voucher' :
                voucherType === 'CASH_PAYMENT' ? 'Cash Payment Voucher' : 'Journal Voucher';
  doc.text(title, 140, 22);
  
  // Metadata
  doc.setFontSize(10);
  doc.text(`Voucher #: ${refNo}`, 140, 30);
  doc.text(`Date: ${date}`, 140, 36);

  // Body
  doc.setFontSize(12);
  doc.text('Account:', 14, 50);
  doc.setFont('helvetica', 'bold');
  doc.text(accountName, 40, 50);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Amount:', 14, 60);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${amount.toLocaleString()}`, 40, 60);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Description:', 14, 70);
  doc.setFont('helvetica', 'italic');
  const splitDescription = doc.splitTextToSize(description || 'N/A', 150);
  doc.text(splitDescription, 40, 70);
  
  // Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('_______________________', 14, 120);
  doc.text('Prepared By', 20, 126);
  
  doc.text('_______________________', 80, 120);
  doc.text('Checked By', 86, 126);
  
  doc.text('_______________________', 145, 120);
  doc.text('Received / Authorized By', 145, 126);
  
  await savePdf(doc, `${voucherType}_${refNo}.pdf`, 'Document');
};

export const generateGenericReportPDF = async (
  report: any,
  fromDate: string,
  toDate: string
) => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(20);
  doc.text('MK Enterprises', 14, 22);
  
  doc.setFontSize(14);
  doc.text(report.title, 14, 30);
  
  doc.setFontSize(10);
  doc.text(`Period: ${fromDate} to ${toDate}`, 14, 36);

  const tableData = [...report.rows];

  if (report.totals && report.totals.length > 0) {
    const totalsRow = new Array(report.headers.length).fill('');
    totalsRow[0] = 'TOTALS';
    // Append totals text to the last column or distribute them
    const totalsText = report.totals.map((t: any) => `${t.label}: ${t.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`).join(' | ');
    totalsRow[totalsRow.length - 1] = totalsText;
    tableData.push(totalsRow);
  }

  autoTable(doc, {
    startY: 45,
    head: [report.headers],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  await savePdf(doc, `${report.title.replace(/ /g, '_')}_${fromDate}_to_${toDate}.pdf`, 'Document');
};
