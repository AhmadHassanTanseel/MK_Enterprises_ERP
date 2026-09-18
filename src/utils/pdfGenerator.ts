import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';
import React from 'react';
import { InvoiceLine, Product, Account } from '../app/context/AppContext';
import { getA4InvoiceHtml } from './pdfTemplate';

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
  amountPaid: number,
  paymentMethod?: string,
  bankName?: string,
  accountTitle?: string,
  accountNumber?: string
) => {
  const loadingId = toast.loading("Generating PDF...");
  
  try {
    const title = invoiceType === 'SALE' ? 'Sale Invoice' :
                  invoiceType === 'PURCHASE' ? 'Purchase Invoice' :
                  invoiceType === 'SALE_RETURN' ? 'Sale Return (Credit Note)' : 'Purchase Return (Debit Note)';
                  
    const data = {
      title,
      refNo,
      date,
      accountLabel: invoiceType.includes('SALE') ? 'Customer' : 'Supplier',
      accountName: account ? account.name : 'Walk-in / Cash',
      paymentMethod,
      bankName,
      accountTitle,
      accountNumber,
      lines: lines.map((line) => {
        const product = products.find(p => p.id === line.product_id);
        const gross = line.qty * line.rate;
        const net = gross - (gross * (line.discount_pct / 100));
        return {
          product: product ? product.name : 'Unknown Product',
          qty: line.qty,
          rate: line.rate,
          total: net
        };
      }),
      gross: grossAmount,
      discount: discountAmount,
      net: netAmount,
      paid: amountPaid,
      balance: netAmount - amountPaid
    };
    
    // Create hidden div
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = getA4InvoiceHtml(data);
    document.body.appendChild(container);
    
    // Wait for fonts to load ideally, but give it a small tick
    await new Promise(r => setTimeout(r, 100));
    
    const canvas = await html2canvas(container.children[0] as HTMLElement, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false
    });
    
    document.body.removeChild(container);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    
    // A4 dimensions in pt: 595.28 x 841.89
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    toast.dismiss(loadingId);
    await savePdf(pdf, `${title.replace(/ /g, '_')}_${refNo}.pdf`, 'Invoice');
    
  } catch (err: any) {
    toast.dismiss(loadingId);
    toast.error(`PDF generation failed: ${err.message}`);
  }
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
  doc.text('Mian Khan Traders', 14, 22);
  
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
  doc.text('Mian Khan Traders', 14, 22);
  
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
