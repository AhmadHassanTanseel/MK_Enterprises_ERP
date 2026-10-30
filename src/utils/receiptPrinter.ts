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
        html, body {
          margin: 0;
          padding: 0;
          height: auto !important;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          width: 72mm;
          margin: 0 auto;
          padding: 3mm 4mm;
          color: #000;
          font-size: 13px;
          -webkit-font-smoothing: antialiased;
          font-weight: 500;
          line-height: 1.35;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mt-1 { margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .border-top { border-top: 1px dashed #000; padding-top: 5px; }
        .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
        .border-solid { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 3px 0; vertical-align: top; font-size: 12px; }
        th { font-weight: bold; border-bottom: 1px solid #000; }
        
        .item-name { width: 100%; display: block; font-size: 13px; font-weight: bold; margin-bottom: 1px; }
        
        .grid-2 { display: grid; grid-template-columns: auto auto; justify-content: space-between; row-gap: 2px; font-size: 12px; }
        .totals-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 3px; font-size: 13px; }
        
        .logo-img {
          width: 60px;
          height: 60px;
          margin: 0 auto 4px auto;
          display: block;
          border-radius: 50%;
        }
        .store-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin: 0;
          text-transform: uppercase;
        }
        .store-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: #333;
          margin-top: 1px;
        }
        .store-meta {
          font-size: 11px;
          color: #222;
          margin-top: 2px;
          line-height: 1.25;
        }
      </style>
    </head>
    <body>
      <!-- Header with Logo, Address & Contact (100% English) -->
      <div class="text-center mb-2">
        <img src="${ZAWAR_LOGO_BASE64}" class="logo-img" alt="Logo" />
        <div class="store-title">ZAWAR TRADERS</div>
        <div class="store-subtitle">Wholesale Dealer & General Order Supplier</div>
        <div class="store-meta">Main Jhang Chiniot Road, Near Cheesy Crunch, Bhowana</div>
        <div class="store-meta font-bold">Cell / WhatsApp: 0345-7611825</div>
      </div>
      
      <!-- Transaction Meta -->
      <div class="text-center font-bold mb-2 border-solid" style="font-size: 13px; letter-spacing: 1px;">
        ${data.title}
      </div>
      
      <div class="grid-2 mb-1">
        <span>Invoice #: <strong>${data.refNo || 'Auto'}</strong></span>
        <span>Date: ${data.date}</span>
      </div>
      <div class="grid-2 mb-2">
        <span>Time: ${timeString}</span>
        ${data.paymentMethod ? `<span>Pay Method: ${data.paymentMethod}</span>` : ''}
      </div>
      
      <div class="mb-2" style="font-size: 12px;">
        <div><span class="font-bold">${data.accountLabel}:</span> ${data.accountName}</div>
        ${data.address ? `<div><span class="font-bold">Address:</span> ${data.address}</div>` : ''}
        ${data.phone ? `<div><span class="font-bold">Phone:</span> ${data.phone}</div>` : ''}
        ${data.deliveryDate ? `<div><span class="font-bold">Delivery Date:</span> ${data.deliveryDate}</div>` : ''}
      </div>

      <!-- Line Items -->
      <div class="border-bottom">
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 50%;">Item</th>
              <th class="text-center" style="width: 22%;">Qty x Rate</th>
              <th class="text-right" style="width: 28%;">Amount</th>
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
        
        <div>Total Quantity:</div>
        <div class="text-right">${totalQty}</div>
        
        <div>Gross Amount:</div>
        <div class="text-right">Rs. ${(data.gross ?? data.totalGross)?.toLocaleString() || "0"}</div>
        
        ${((data.discount ?? data.totalDiscount) || 0) > 0 ? `
          <div>Discount:</div>
          <div class="text-right">- Rs. ${(data.discount ?? data.totalDiscount)?.toLocaleString()}</div>
        ` : ''}
        
        <div class="font-bold mt-1" style="font-size: 14px;">THIS INVOICE TOTAL:</div>
        <div class="text-right font-bold mt-1" style="font-size: 14px;">Rs. ${thisBillNet.toLocaleString()}</div>
        
        <div class="mt-1">Amount Paid:</div>
        <div class="text-right mt-1">Rs. ${paidToday.toLocaleString()}</div>
        
        <div>Invoice Balance:</div>
        <div class="text-right">Rs. ${(data.balance)?.toLocaleString() || "0"}</div>
      </div>

      <!-- KHATA / ACCOUNT LEDGER SUMMARY (100% English) -->
      ${prevBal !== null ? `
      <div class="border-bottom mt-2 pb-2">
        <div class="text-center font-bold mb-1" style="font-size: 12px; background: #e5e7eb; padding: 3px; letter-spacing: 0.5px; border-radius: 2px;">
          ${data.isSupplier ? 'SUPPLIER LEDGER SUMMARY' : 'CUSTOMER ACCOUNT SUMMARY'}
        </div>
        <div class="totals-grid" style="font-size: 12px;">
          <div>Previous Balance:</div>
          <div class="text-right">Rs. ${prevBal.toLocaleString()}</div>

          <div>Current Invoice:</div>
          <div class="text-right">Rs. ${thisBillNet.toLocaleString()}</div>

          <div>Paid Today:</div>
          <div class="text-right">Rs. ${paidToday.toLocaleString()}</div>

          <div class="font-bold mt-1" style="font-size: 13px;">NET ACCOUNT BALANCE:</div>
          <div class="text-right font-bold mt-1" style="font-size: 13px;">Rs. ${(calculatedNetBal ?? 0).toLocaleString()}</div>
        </div>
      </div>
      ` : ''}
      
      <div class="mt-2 mb-2" style="font-size: 12px; font-weight: 600;">
        <span class="font-bold">Signature:</span> _________________ <span style="margin-left:10px;">${data.staffName ? '(' + data.staffName + ')' : ''}</span>
      </div>

      <div class="text-center mt-2 border-top" style="padding-top: 6px; font-size: 11px; color: #444;">
        <div style="font-weight: 600; margin-bottom: 2px;">Note: Opened or damaged goods cannot be claimed or returned without receipt.</div>
        Thank you for your business!
        <br/>
        <span style="font-size: 10px; color: #777;">Software by Ahmad Hassan Tanseel</span>
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
