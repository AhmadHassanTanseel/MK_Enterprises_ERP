import { ZAWAR_LOGO_BASE64 } from '../assets/logoBase64';

export const getA4InvoiceHtml = (data: any) => {
  const prevBal = data.previousBalance !== undefined ? data.previousBalance : null;
  const thisBillNet = (data.net ?? data.totalNet) || 0;
  const paidToday = (data.paid ?? data.amountReceived ?? data.amountPaid) || 0;
  const calculatedNetBal = data.netAccountBalance !== undefined 
    ? data.netAccountBalance 
    : (prevBal !== null ? (prevBal + (thisBillNet - paidToday)) : null);

  return `
    <div style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; position: relative;">
      
      <!-- Official Header (100% English) -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${ZAWAR_LOGO_BASE64}" style="width: 75px; height: 75px; margin: 0 auto 8px auto; display: block; border-radius: 50%;" />
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; color: #0f172a; text-transform: uppercase;">ZAWAR TRADERS</h1>
        <p style="margin: 3px 0 0; font-size: 13px; font-weight: 600; color: #475569;">Wholesale Dealer & General Order Supplier</p>
        <p style="margin: 3px 0 0; font-size: 12px; color: #64748b;">Main Jhang Chiniot Road, Near Cheesy Crunch, Bhowana</p>
        <p style="margin: 3px 0 0; font-size: 12px; font-weight: 700; color: #1e293b;">Cell / WhatsApp: 0345-7611825</p>
      </div>

      <hr style="border: 0; border-top: 2px solid #0f172a; margin: 15px 0;" />

      <!-- Title & Meta -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #1e40af;">${data.title}</h2>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
        <div>
          <p style="margin: 0 0 5px;"><strong>Invoice #:</strong> ${data.refNo || 'Auto'}</p>
          <p style="margin: 0 0 5px;"><strong>Date:</strong> ${data.date}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 5px;"><strong>${data.accountLabel}:</strong> ${data.accountName}</p>
          ${data.phone ? `<p style="margin: 0 0 5px;"><strong>Contact:</strong> ${data.phone}</p>` : ''}
          ${data.address ? `<p style="margin: 0 0 5px;"><strong>Address:</strong> ${data.address}</p>` : ''}
        </div>
      </div>

      <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 15px 0;" />

      <!-- Payment & Bank Info -->
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 20px;">
        <div>
          <p style="margin: 0 0 5px;"><strong>Payment Method:</strong> ${data.paymentMethod || 'Cash'}</p>
        </div>
        <div style="border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; background: #f8fafc; min-width: 260px;">
          <p style="margin: 0 0 4px; font-weight: bold; color: #334155;">Bank Details for Payment:</p>
          <p style="margin: 0 0 3px;"><strong>Account Title:</strong> ${data.accountTitle && data.accountTitle !== '_________________' ? data.accountTitle : 'Zawar Traders'}</p>
          <p style="margin: 0 0 3px;"><strong>Bank Name:</strong> ${data.bankName && data.bankName !== '_________________' ? data.bankName : 'Meezan Bank'}</p>
          <p style="margin: 0;"><strong>A/C No:</strong> ${data.accountNumber && data.accountNumber !== '_________________' ? data.accountNumber : '0101-0103456789'}</p>
        </div>
      </div>

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #1e40af; color: white; text-align: left;">
            <th style="padding: 10px 8px; width: 40px; text-align: center;">#</th>
            <th style="padding: 10px 8px;">Item Description</th>
            <th style="padding: 10px 8px; text-align: center; width: 80px;">Quantity</th>
            <th style="padding: 10px 8px; text-align: right; width: 100px;">Rate (Rs)</th>
            <th style="padding: 10px 8px; text-align: right; width: 120px;">Amount (Rs)</th>
          </tr>
        </thead>
        <tbody>
          ${data.lines.map((l: any, i: number) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 9px 8px; text-align: center; color: #64748b;">${i + 1}</td>
              <td style="padding: 9px 8px; font-weight: 600;">${l.product} ${l.flavor && l.flavor !== 'None' ? '(' + l.flavor + ')' : ''}</td>
              <td style="padding: 9px 8px; text-align: center;">${l.qty}</td>
              <td style="padding: 9px 8px; text-align: right;">${l.rate?.toLocaleString() || "0"}</td>
              <td style="padding: 9px 8px; text-align: right; font-weight: 600;">${l.total?.toLocaleString() || "0"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals & Khata Summary -->
      <div style="display: flex; justify-content: flex-end; font-size: 13px; margin-bottom: 40px;">
        <div style="width: 320px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Total Items:</span>
            <span>${data.lines.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Total Quantity:</span>
            <span>${data.lines.reduce((sum: number, l: any) => sum + (Number(l.qty) || 0), 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Gross Total:</span>
            <span>Rs. ${data.gross?.toLocaleString() || "0"}</span>
          </div>
          ${(data.discount || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #dc2626;">
              <span>Discount:</span>
              <span>- Rs. ${data.discount?.toLocaleString()}</span>
            </div>
          ` : ''}
          <hr style="border: 0; border-top: 2px solid #0f172a; margin: 8px 0;" />
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 800; font-size: 15px; color: #0f172a;">
            <span>THIS INVOICE TOTAL:</span>
            <span>Rs. ${thisBillNet.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Amount Paid:</span>
            <span>Rs. ${paidToday.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Invoice Balance:</span>
            <span>Rs. ${(data.balance)?.toLocaleString() || "0"}</span>
          </div>

          ${prevBal !== null ? `
          <hr style="border: 0; border-top: 1px dashed #94a3b8; margin: 12px 0 8px 0;" />
          <div style="background: #f1f5f9; padding: 5px 8px; border-radius: 4px; margin-bottom: 8px; text-align: center; font-weight: bold; font-size: 12px; letter-spacing: 0.5px; color: #1e3a8a;">
            ACCOUNT BALANCE SUMMARY
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Previous Balance:</span>
            <span>Rs. ${prevBal.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>This Invoice:</span>
            <span>Rs. ${thisBillNet.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Paid Today:</span>
            <span>Rs. ${paidToday.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 5px; border-top: 1px solid #cbd5e1; font-weight: 800; font-size: 14px; color: #1e3a8a;">
            <span>NET ACCOUNT BALANCE:</span>
            <span>Rs. ${(calculatedNetBal ?? 0).toLocaleString()}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Signature & Footer -->
      <div style="position: absolute; bottom: 45px; left: 40px; right: 40px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <div>
            <p style="margin: 0 0 5px;">Authorized Signature: _______________________</p>
          </div>
          <div style="text-align: right; color: #64748b;">
            <p style="margin: 0 0 3px; font-weight: 500;">Note: Opened or damaged goods cannot be claimed without receipt.</p>
            <p style="margin: 0 0 3px;">Thank you for your business!</p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Software by Ahmad Hassan Tanseel</p>
          </div>
        </div>
      </div>

    </div>
  `;
};
