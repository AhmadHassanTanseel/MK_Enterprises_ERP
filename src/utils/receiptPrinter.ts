import toast from 'react-hot-toast';
import { ZAWAR_LOGO_BASE64 } from '../assets/logoBase64';

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
  isSupplier?: boolean;
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
  
  const totalItems = data.lines.length;
  const totalQty = data.lines.reduce((sum, l) => sum + (l.qty || 0), 0);
  const now = new Date();
  const timeString = data.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const prevBal = data.previousBalance !== undefined ? data.previousBalance : null;
  const thisBillNet = (data.net ?? data.totalNet) || 0;
  const paidToday = (data.paid ?? data.amountReceived ?? data.amountPaid) || 0;
  const calculatedNetBal = data.netAccountBalance !== undefined 
    ? data.netAccountBalance 
    : (prevBal !== null ? (prevBal + (thisBillNet - paidToday)) : null);

  const html = `
    <html>
    <head>
      <title>${data.title}</title>
      <meta charset="UTF-8">
      <style>
        @page { 
          margin: 0; 
          size: auto;
        }
        html, body {
          margin: 0;
          padding: 0;
          height: auto !important;
        }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 72mm;
          margin: 0 auto;
          padding: 2mm 3mm;
          color: #000;
          font-size: 13px;
          -webkit-font-smoothing: none;
          font-weight: 600;
          line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mt-1 { margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .border-top { border-top: 1px dashed #000; padding-top: 4px; }
        .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 2px 0; vertical-align: top; font-size: 13px; font-weight: 600; }
        
        .item-name { width: 100%; display: block; font-size: 13px; font-weight: bold; margin-bottom: 1px; }
        
        .grid-2 { display: grid; grid-template-columns: auto auto; justify-content: space-between; row-gap: 2px; }
        .totals-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 3px; font-size: 13px; font-weight: 600; }
        
        .urdu-title {
          font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
          font-size: 24px;
          font-weight: bold;
          line-height: 1.3;
          margin: 0;
          direction: rtl;
        }
        .urdu-text {
          font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
          direction: rtl;
        }
        .logo-img {
          width: 58px;
          height: 58px;
          margin: 0 auto 3px auto;
          display: block;
          border-radius: 50%;
        }
      </style>
    </head>
    <body>
      <!-- Header with Logo, Address & Contact -->
      <div class="text-center mb-2">
        <img src="${ZAWAR_LOGO_BASE64}" class="logo-img" alt="Logo" />
        <div class="urdu-title">زوار ٹریڈرز</div>
        <div style="font-weight: bold; font-size: 12px; margin-top: -2px;">Zawar Traders</div>
        <div class="urdu-text" style="font-size: 13px;">ہول سیل ڈیلر اینڈ جنرل آرڈر سپلائر</div>
        <div class="urdu-text" style="font-size: 12px; margin-top: 2px;">مین جھنگ چنیوٹ روڈ نزد چیزی کرنچ بھوآنہ</div>
        <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">رابطہ: 03457611825</div>
      </div>
      
      <!-- Transaction Meta -->
      <div class="text-center font-bold mb-2 border-bottom border-top" style="font-size: 13px;">
        ${data.title}
      </div>
      
      <div class="grid-2 mb-1">
        <span>Inv #: ${data.refNo || 'Auto'}</span>
        <span>Date: ${data.date}</span>
      </div>
      <div class="grid-2 mb-2">
        <span>Time: ${timeString}</span>
      </div>
      
      <div class="mb-2">
        <div><span class="font-bold">${data.accountLabel}:</span> ${data.accountName}</div>
        ${data.address ? `<div><span class="font-bold">Address:</span> ${data.address}</div>` : ''}
        ${data.phone ? `<div><span class="font-bold">Phone:</span> ${data.phone}</div>` : ''}
        ${data.deliveryDate ? `<div><span class="font-bold">Delivery Date:</span> ${data.deliveryDate}</div>` : ''}
      </div>

      <!-- Line Items -->
      <div class="border-bottom">
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th class="text-left" style="width: 45%;">Item</th>
              <th class="text-center" style="width: 25%;">Qty x Rate</th>
              <th class="text-right" style="width: 30%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.lines.map(l => `
              <tr>
                <td colspan="3" class="item-name">${l.product}</td>
              </tr>
              <tr>
                <td></td>
                <td class="text-center">${l.qty} x ${l.rate?.toLocaleString() || "0"}</td>
                <td class="text-right">${l.total?.toLocaleString() || "0"}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Current Bill Totals -->
      <div class="totals-grid mt-2 border-bottom">
        <div>Total Items:</div>
        <div class="text-right">${totalItems}</div>
        
        <div>Total Qty:</div>
        <div class="text-right">${totalQty}</div>
        
        <div>Net Bill:</div>
        <div class="text-right">${(data.gross ?? data.totalGross)?.toLocaleString() || "0"}</div>
        
        <div>Discount:</div>
        <div class="text-right">${(data.discount ?? data.totalDiscount)?.toLocaleString() || "0"}</div>
        
        <div class="font-bold mt-1" style="font-size: 14px;">THIS BILL:</div>
        <div class="text-right font-bold mt-1" style="font-size: 14px;">${thisBillNet.toLocaleString()}</div>
        
        <div class="mt-1">Paid Today:</div>
        <div class="text-right mt-1">${paidToday.toLocaleString()}</div>
        
        <div>Bill Balance:</div>
        <div class="text-right">${(data.balance)?.toLocaleString() || "0"}</div>
      </div>

      <!-- KHATA / ACCOUNT LEDGER SUMMARY (سابقہ اور کل کھاتہ بقایا) -->
      ${prevBal !== null ? `
      <div class="border-bottom mt-2 pb-2">
        <div class="urdu-text text-center font-bold mb-1" style="font-size: 14px; background: #eee; padding: 2px;">
          کھاتہ بقایا جات (Account Balance Summary)
        </div>
        <div class="totals-grid">
          <div>سابقہ بقایا (Previous Bal):</div>
          <div class="text-right">${prevBal.toLocaleString()}</div>

          <div>موجودہ بل (This Bill):</div>
          <div class="text-right">${thisBillNet.toLocaleString()}</div>

          <div>آج ادا شدہ (Paid Today):</div>
          <div class="text-right">${paidToday.toLocaleString()}</div>

          <div class="font-bold mt-1" style="font-size: 14px;">کل نیٹ بقایا (Net Balance):</div>
          <div class="text-right font-bold mt-1" style="font-size: 14px;">${(calculatedNetBal ?? 0).toLocaleString()}</div>
        </div>
      </div>
      ` : ''}
      
      <div class="mt-2 mb-2" style="font-size: 13px; font-weight: 600;">
        <span class="font-bold">Signature:</span> _________________ <span style="margin-left:10px;">${data.staffName ? '(' + data.staffName + ')' : ''}</span>
      </div>

      <div class="text-center mt-2 border-top" style="padding-top: 6px; font-size: 10px;">
        <div class="urdu-text" style="font-size: 11px; margin-bottom: 4px;">نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔</div>
        Thank you for your business!
        <br/>
        Software by Ahmad Hassan Tanseel
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
