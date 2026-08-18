export function printContent(title: string, contentHtml: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 18px; border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 16px; }
        h2 { font-size: 14px; color: #475569; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
        th { background: #f1f5f9; font-weight: 600; }
        .text-right { text-align: right; }
        .totals { margin-top: 16px; text-align: right; font-weight: bold; font-size: 14px; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 12px; }
        .header-info span { font-size: 12px; color: #64748b; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${contentHtml}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
}
