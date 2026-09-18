import toast from 'react-hot-toast';

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
  paymentMethod?: 'Cash' | 'Online';
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  staffName?: string;
  lines: ReceiptLine[];
  gross: number;
  discount: number;
  net: number;
  paid: number;
  balance: number;
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

  const html = `
    <html>
    <head>
      <title>${data.title}</title>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 72mm; /* 80mm paper width minus small margins */
          margin: 0 auto;
          padding: 2mm 4mm;
          color: #000;
          font-size: 12px;
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
        th, td { padding: 2px 0; vertical-align: top; font-size: 11px; }
        
        .item-name { width: 100%; display: block; font-size: 12px; font-weight: bold; margin-bottom: 1px; }
        
        .grid-2 { display: grid; grid-template-columns: auto auto; justify-content: space-between; row-gap: 2px; }
        .totals-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 3px; font-size: 12px; }
        
        .urdu-title {
          font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
          font-size: 26px;
          font-weight: bold;
          line-height: 1.4;
          margin: 0;
          direction: rtl;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="text-center mb-2">
        <div class="urdu-title">میاں خان ٹریڈرز</div>
        <div style="font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif; font-size: 14px; direction: rtl;">نزد نیشنل بینک جھنگ چنیوٹ روڈ بھوانہ</div>
        <div style="font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif; font-size: 14px; direction: rtl;">حاجی میاں خان 5973612-0345</div>
      </div>
      
      <!-- Transaction Meta -->
      <div class="text-center font-bold mb-2 border-bottom border-top" style="font-size: 14px;">
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

      <div class="mb-2 border-top border-bottom">
        <div class="grid-2">
          <span class="font-bold">Payment Method:</span> 
          <span>${data.paymentMethod || 'Cash'}</span>
        </div>
        <div class="mt-1" style="font-size: 11px;">
          <div><strong>For online payment</strong></div>
          <div>Account: ${data.accountTitle && data.accountTitle !== '_________________' ? data.accountTitle : '_________________'}</div>
          <div>Bank: ${data.bankName && data.bankName !== '_________________' ? data.bankName : '_________________'}</div>
          <div>Account number: ${data.accountNumber && data.accountNumber !== '_________________' ? data.accountNumber : '_________________'}</div>
        </div>
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
                <td class="text-center">${l.qty} x ${l.rate.toLocaleString()}</td>
                <td class="text-right">${l.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Footer Totals -->
      <div class="totals-grid mt-2 border-bottom">
        <div>Total Items:</div>
        <div class="text-right">${totalItems}</div>
        
        <div>Total Qty:</div>
        <div class="text-right">${totalQty}</div>
        
        <div>Net Bill:</div>
        <div class="text-right">${data.gross.toLocaleString()}</div>
        
        <div>Discount:</div>
        <div class="text-right">${data.discount.toLocaleString()}</div>
        
        <div class="font-bold mt-1" style="font-size: 14px;">TOTAL BILL:</div>
        <div class="text-right font-bold mt-1" style="font-size: 14px;">${data.net.toLocaleString()}</div>
        
        <div class="mt-1">Total Paid:</div>
        <div class="text-right mt-1">${data.paid.toLocaleString()}</div>
        
        <div>Bakaya:</div>
        <div class="text-right">${data.balance.toLocaleString()}</div>
      </div>
      
      <div class="mt-2 mb-2" style="font-size: 11px;">
        <span class="font-bold">Signature:</span> _________________ <span style="margin-left:10px;">${data.staffName ? '(' + data.staffName + ')' : ''}</span>
      </div>

      <div class="text-center mt-2 border-top" style="padding-top: 6px; font-size: 10px;">
        Thank you for your business!
        <br/>
        Software by Antigravity
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
