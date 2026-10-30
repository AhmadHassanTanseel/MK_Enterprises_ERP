import toast from 'react-hot-toast';
import { ZAWAR_LOGO_BASE64 } from '../assets/logoBase64';

export function printContent(title: string, contentHtml: string) {
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
    toast.error(`Could not prepare ${title} for printing: Iframe failed.`);
    document.body.removeChild(iframe);
    return;
  }
  
  const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { margin: 12mm 10mm; size: auto; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          padding: 10px; 
          color: #0f172a; 
          line-height: 1.4;
        }
        .letterhead {
          text-align: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .store-logo {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          margin: 0 auto 6px auto;
          display: block;
        }
        .store-name {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 1px;
          margin: 0;
          text-transform: uppercase;
          color: #0f172a;
        }
        .store-tagline {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-top: 2px;
        }
        .store-contact {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .report-title {
          font-size: 16px;
          font-weight: 800;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }
        .report-date {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px; 
          font-size: 11px; 
        }
        th, td { 
          border: 1px solid #cbd5e1; 
          padding: 6px 10px; 
          text-align: left; 
        }
        th { 
          background: #1e40af; 
          color: #ffffff; 
          font-weight: bold; 
          text-transform: uppercase;
          font-size: 11px;
        }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .totals { 
          margin-top: 16px; 
          text-align: right; 
          font-weight: bold; 
          font-size: 13px; 
        }
        .footer-note {
          margin-top: 24px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
        @media print { 
          body { padding: 0; } 
          th { background: #1e40af !important; -webkit-print-color-adjust: exact; color: #fff !important; }
        }
      </style>
    </head>
    <body>
      <!-- Financial Statement Style Letterhead -->
      <div class="letterhead">
        <img src="${ZAWAR_LOGO_BASE64}" class="store-logo" alt="Logo" />
        <h1 class="store-name">ZAWAR TRADERS</h1>
        <div class="store-tagline">Wholesale Dealer & General Order Supplier</div>
        <div class="store-contact">Main Jhang Chiniot Road, Near Cheesy Crunch, Bhowana | Cell / WhatsApp: 0345-7611825</div>
      </div>

      <div class="report-header">
        <h2 class="report-title">${title}</h2>
        <span class="report-date">Printed on: ${printDate}</span>
      </div>

      <div class="report-body">
        ${contentHtml}
      </div>

      <div class="footer-note">
        <span>Zawar Traders Business Management System</span>
        <span>Software by Ahmad Hassan Tanseel</span>
      </div>
    </body>
    </html>
  `);
  doc.close();
  
  const win = iframe.contentWindow;
  if (win) {
    win.focus();
    setTimeout(() => { 
      win.print(); 
      toast.success(`Sending ${title} to printer...`);
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  } else {
    document.body.removeChild(iframe);
  }
}
