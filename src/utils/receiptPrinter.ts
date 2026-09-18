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
  accountName: string;
  accountLabel: string;
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
  
  const html = `
    <html>
    <head>
      <title>${data.title}</title>
      <style>
        @page {
          margin: 0;
        }
        body { 
          font-family: 'Courier New', Courier, monospace; /* Monospace is best for receipts */
          width: 76mm; /* Standard 80mm paper width leaving a tiny margin */
          margin: 0 auto;
          padding: 5mm;
          color: #000;
          font-size: 12px;
          line-height: 1.2;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .mb-1 { margin-bottom: 5px; }
        .mb-2 { margin-bottom: 10px; }
        .mt-2 { margin-top: 10px; }
        .border-top { border-top: 1px dashed #000; padding-top: 5px; }
        .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 2px 0; vertical-align: top; }
        
        /* Layout for line items */
        .item-name { width: 100%; display: block; margin-bottom: 2px; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; padding-left: 5px; }
        
        .totals-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          row-gap: 4px;
        }
      </style>
    </head>
    <body>
      <div class="text-center mb-2">
        <h2 style="margin: 0; font-size: 18px;">MK ENTERPRISES</h2>
        <div style="font-size: 10px; margin-top: 2px;">Business Management System</div>
      </div>
      
      <div class="text-center font-bold mb-2 border-bottom border-top">
        ${data.title}
      </div>
      
      <div class="mb-2">
        <div style="display: flex; justify-content: space-between;">
          <span>Ref: ${data.refNo || '-'}</span>
          <span>Date: ${data.date}</span>
        </div>
        <div class="mt-2">
          <span class="font-bold">${data.accountLabel}:</span> ${data.accountName}
        </div>
      </div>
      
      <div class="border-top border-bottom">
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 40%;">Item</th>
              <th class="text-right" style="width: 25%;">Qty x Rate</th>
              <th class="text-right" style="width: 35%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.lines.map(l => `
              <tr>
                <td colspan="3" class="item-name">${l.product}</td>
              </tr>
              <tr>
                <td></td>
                <td class="text-right" style="font-size: 11px;">${l.qty} x ${l.rate.toLocaleString()}</td>
                <td class="text-right font-bold">${l.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="totals-grid mt-2">
        <div>Gross Total:</div>
        <div class="text-right">${data.gross.toLocaleString()}</div>
        
        <div>Discount:</div>
        <div class="text-right">${data.discount.toLocaleString()}</div>
        
        <div class="font-bold" style="font-size: 14px; margin-top: 4px;">NET TOTAL:</div>
        <div class="text-right font-bold" style="font-size: 14px; margin-top: 4px;">${data.net.toLocaleString()}</div>
        
        <div style="margin-top: 4px;">Paid:</div>
        <div class="text-right" style="margin-top: 4px;">${data.paid.toLocaleString()}</div>
        
        <div>Balance:</div>
        <div class="text-right">${data.balance.toLocaleString()}</div>
      </div>
      
      <div class="text-center mt-2 border-top" style="padding-top: 10px; font-size: 10px;">
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
