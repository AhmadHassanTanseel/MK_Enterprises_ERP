import toast from 'react-hot-toast';
import { ZAWAR_RECEIPT_LOGO_BASE64 } from '../assets/logoBase64';

export interface ReceiptLine {
  product: string;
  qty: number;
  rate: number;
  total: number;
}

export interface ReceiptData {
  title: string;
  refNo: string;
  date: string;
  time?: string;
  accountName: string;
  accountLabel: string;
  address?: string;
  phone?: string;
  deliveryDate?: string;
  paymentMethod?: 'Cash' | 'Online' | 'Cash & Bank' | 'Payment in Bank' | 'Payment via Cash' | 'Credit' | string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  staffName?: string;
  lines: ReceiptLine[];
  gross?: number;
  totalGross?: number;
  discount?: number;
  totalDiscount?: number;
  net?: number;
  totalNet?: number;
  paid?: number;
  amountReceived?: number;
  amountPaid?: number;
  balance: number;
  previousBalance?: number;
  netAccountBalance?: number;
  cashTendered?: number;
  changeReturn?: number;
  isSupplier?: boolean;
  isWalkIn?: boolean;
}

export function printThermalReceipt(data: ReceiptData) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    toast.error('Could not prepare receipt for printing: Iframe failed.');
    document.body.removeChild(iframe);
    return;
  }
  
  const totalQty = data.lines.reduce((sum, l) => sum + (l.qty || 0), 0);
  const now = new Date();
  const timeString = data.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isWalkIn = 
    Boolean(data.isWalkIn) || 
    data.accountName?.toLowerCase().includes('walk-in') || 
    data.accountName?.toLowerCase().includes('walk in') ||
    data.accountName?.toLowerCase().includes('general supplier');

  const thisBillNet = (data.net ?? data.totalNet) || 0;
  const paidToday = (data.paid ?? data.amountReceived ?? data.amountPaid) || 0;
  const billBal = thisBillNet - paidToday;

  const prevBal = !isWalkIn 
    ? (data.previousBalance !== undefined 
        ? data.previousBalance 
        : (data.netAccountBalance !== undefined 
            ? (data.isSupplier ? data.netAccountBalance + billBal : data.netAccountBalance - billBal) 
            : 0))
    : null;

  const calculatedNetBal = !isWalkIn 
    ? (data.netAccountBalance !== undefined 
        ? data.netAccountBalance 
        : ((prevBal ?? 0) + (data.isSupplier ? -billBal : billBal)))
    : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${data.title}</title>
      <meta charset="UTF-8">
      <style>
        @page { 
          margin: 0; 
          size: auto;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
          }
          * {
            color: #000000 !important;
          }
        }
        * {
          box-sizing: border-box !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          height: auto !important;
          background: #fff;
          width: 100%;
        }
        body { 
          font-family: Arial, Helvetica, -apple-system, sans-serif;
          width: 100%;
          max-width: 50mm;
          margin: 0 auto;
          padding: 1.5mm 1.5mm 2mm 1.5mm;
          color: #000000 !important;
          font-size: 10px;
          line-height: 1.25;
          font-weight: 500;
          box-sizing: border-box;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .border-top { border-top: 1px solid #000; padding-top: 3px; }
        .border-bottom { border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 3px; }
        .border-solid { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; }
        
        .logo-img {
          width: 100%;
          max-width: 44mm;
          height: auto;
          margin: 0 auto 4px auto;
          display: block;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        .store-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin: 1px 0;
          text-transform: uppercase;
          color: #000000 !important;
        }
        .store-meta {
          font-size: 10.5px;
          line-height: 1.25;
          margin: 1px 0;
          color: #000000 !important;
        }

        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 3px 0;
          table-layout: fixed;
        }
        table.items-table th {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 2.5px 1px;
          font-size: 10px;
          font-weight: bold;
          color: #000000 !important;
        }
        table.items-table td {
          padding: 2px 1px;
          font-size: 10px;
          vertical-align: middle;
          color: #000000 !important;
        }
        table.items-table th:last-child,
        table.items-table td:last-child {
          padding-right: 1px;
        }
        
        .totals-container {
          margin-top: 3px;
          padding: 2px 1px;
          font-size: 11px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 1.5px 0;
          color: #000000 !important;
        }
        .totals-row span:last-child {
          padding-right: 1px;
        }
        .grid-2 {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          padding: 1px 1px 1px 0;
          color: #000000 !important;
        }
      </style>
    </head>
    <body>
      <!-- Header with Logo, Address & Contacts (100% Crisp) -->
      <div class="text-center" style="margin-bottom: 4px;">
        <img src="${ZAWAR_RECEIPT_LOGO_BASE64}" class="logo-img" alt="Zawar Traders" />
        <div class="store-meta">Jhang Chiniot Road</div>
        <div class="store-meta font-bold">Cell: 0333-7701890</div>
        <div class="store-meta font-bold">WhatsApp: 0345-7611825</div>
      </div>
      
      <!-- Transaction Meta -->
      <div class="text-center font-bold border-solid" style="font-size: 13px; letter-spacing: 0.5px; margin: 4px 0;">
        ${data.title}
      </div>
      
      <div class="grid-2">
        <span>Invoice No.: <strong>${data.refNo || 'Auto'}</strong></span>
        <span>Date: ${data.date}</span>
      </div>
      <div class="grid-2" style="margin-bottom: 2px;">
        <span>Time: ${timeString}</span>
        ${data.paymentMethod ? `<span>Pay: ${data.paymentMethod}</span>` : ''}
      </div>
      
      <div style="font-size: 11px; margin-bottom: 4px; padding-bottom: 2px;">
        <div><span class="font-bold">${data.accountLabel}:</span> ${data.accountName}</div>
        ${!isWalkIn && data.address ? `<div><span class="font-bold">Address:</span> ${data.address}</div>` : ''}
        ${!isWalkIn && data.phone ? `<div><span class="font-bold">Phone:</span> ${data.phone}</div>` : ''}
        ${data.deliveryDate ? `<div><span class="font-bold">Delivery Date:</span> ${data.deliveryDate}</div>` : ''}
      </div>

      <!-- Line Items (Reference 1 Aligned Single-Line Table) -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 7%; text-align: left;">#</th>
            <th style="width: 39%; text-align: left;">Name</th>
            <th style="width: 13%; text-align: center;">Qty</th>
            <th style="width: 18%; text-align: right;">Price</th>
            <th style="width: 23%; text-align: right; padding-right: 1px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.lines.map((l, idx) => `
            <tr>
              <td style="text-align: left;">${idx + 1}</td>
              <td style="text-align: left; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${l.product}">${l.product}</td>
              <td style="text-align: center;">${l.qty}</td>
              <td style="text-align: right;">${l.rate?.toLocaleString() || "0"}</td>
              <td style="text-align: right; font-weight: bold; padding-right: 1px;">${l.total?.toLocaleString() || "0"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <!-- Current Bill Totals (Compact Reference 1 Style) -->
      <div class="totals-container border-top border-bottom">
        <div class="totals-row font-bold" style="font-size: 13px; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 2px;">
          <span>Total Items: ${data.lines.length} | Qty: ${totalQty}</span>
          <span>Rs. ${thisBillNet.toLocaleString()}</span>
        </div>

        ${((data.gross ?? data.totalGross) || 0) !== thisBillNet ? `
          <div class="totals-row">
            <span>Sub Total:</span>
            <span>Rs. ${(data.gross ?? data.totalGross)?.toLocaleString() || "0"}</span>
          </div>
        ` : ''}

        ${((data.discount ?? data.totalDiscount) || 0) > 0 ? `
          <div class="totals-row">
            <span>Discount:</span>
            <span>- Rs. ${(data.discount ?? data.totalDiscount)?.toLocaleString()}</span>
          </div>
        ` : ''}

        <div class="totals-row font-bold">
          <span>Net Amount:</span>
          <span>Rs. ${thisBillNet.toLocaleString()}</span>
        </div>

        <div class="totals-row">
          <span>Received:</span>
          <span>Rs. ${paidToday.toLocaleString()}</span>
        </div>

        ${(data.cashTendered ?? 0) > 0 ? `
          <div class="totals-row">
            <span>Cash Tendered:</span>
            <span>Rs. ${(data.cashTendered || 0).toLocaleString()}</span>
          </div>
          <div class="totals-row font-bold">
            <span>Change Return:</span>
            <span>Rs. ${(data.changeReturn || 0).toLocaleString()}</span>
          </div>
        ` : ''}

        ${!isWalkIn && (data.balance || 0) !== 0 ? `
          <div class="totals-row font-bold">
            <span>Balance:</span>
            <span>Rs. ${(data.balance)?.toLocaleString() || "0"}</span>
          </div>
        ` : ''}
      </div>

      <!-- KHATA / ACCOUNT LEDGER SUMMARY (Registered / Credit Accounts Only) -->
      ${!isWalkIn ? `
      <div class="border-bottom" style="margin-top: 4px; padding-bottom: 4px;">
        <div class="text-center font-bold" style="font-size: 11px; background: #000; color: #fff !important; padding: 2px; margin-bottom: 3px; letter-spacing: 0.5px;">
          ${data.isSupplier ? 'SUPPLIER ACCOUNT SUMMARY (کھاتہ کی تفصیل)' : 'CUSTOMER ACCOUNT SUMMARY (کھاتہ کی تفصیل)'}
        </div>
        <div class="totals-row" style="font-size: 11px;">
          <span>Previous Balance (پچھلا بقایا):</span>
          <span>Rs. ${(prevBal ?? 0).toLocaleString()}</span>
        </div>
        <div class="totals-row" style="font-size: 11px;">
          <span>Current Bill (موجودہ بل):</span>
          <span>Rs. ${thisBillNet.toLocaleString()}</span>
        </div>
        <div class="totals-row" style="font-size: 11px;">
          <span>${data.isSupplier ? 'Paid (ادائیگی)' : 'Paid (وصول رقم)'}:</span>
          <span>Rs. ${paidToday.toLocaleString()}</span>
        </div>
        <div class="totals-row font-bold" style="font-size: 12px; border-top: 1px solid #000; padding-top: 2px; margin-top: 2px;">
          <span>${data.isSupplier ? 'NET PAYABLES (کل واجب الاداء):' : 'NET RECEIVABLES (کل واجب الوصول):'}</span>
          <span>Rs. ${(calculatedNetBal ?? 0).toLocaleString()}</span>
        </div>
      </div>
      ` : ''}
      
      ${!isWalkIn ? `
      <div style="margin-top: 4px; margin-bottom: 4px; font-size: 11px; font-weight: bold;">
        <span>Signature:</span> _________________ ${data.staffName ? '(' + data.staffName + ')' : ''}
      </div>
      ` : ''}

      <!-- Urdu Notice (from Reference 3) -->
      <div style="direction: rtl; text-align: center; margin-top: 5px; padding-top: 4px; border-top: 1px dashed #000; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; font-weight: bold; line-height: 1.35; color: #000 !important;">
        <div>نوٹ: اپنا مال چیک کر کے لیں۔ کسی قسم کی واپسی یا کلیم نہیں ہوگا</div>
        <div>ایکسپائری چیک کر کے لیں۔ بعد میں کمپنی ذمہ دار نہیں ہوگی</div>
      </div>

      <div class="text-center" style="margin-top: 4px; font-size: 11px; font-weight: bold; color: #000 !important;">
        Thanks for shopping with us!
        <br/>
        <span style="font-size: 10px; font-weight: normal; color: #000 !important;">Software by Ahmad Hassan Tanseel</span>
      </div>
    </body>
    </html>
  `;
  
  doc.open();
  doc.write(html);
  doc.close();
  
  const win = iframe.contentWindow;
  if (win) {
    win.focus();
    setTimeout(() => { 
      win.print(); 
      toast.success('Sent to Thermal Printer!');
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  } else {
    document.body.removeChild(iframe);
  }
}
