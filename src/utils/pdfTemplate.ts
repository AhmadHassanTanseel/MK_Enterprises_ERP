import { ZAWAR_LOGO_BASE64 } from '../assets/logoBase64';

export const getA4InvoiceHtml = (data: any) => {
  const prevBal = data.previousBalance !== undefined ? data.previousBalance : null;
  const thisBillNet = (data.net ?? data.totalNet) || 0;
  const paidToday = (data.paid ?? data.amountReceived ?? data.amountPaid) || 0;
  const calculatedNetBal = data.netAccountBalance !== undefined 
    ? data.netAccountBalance 
    : (prevBal !== null ? (prevBal + (thisBillNet - paidToday)) : null);

  return `
    <div style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background: white; font-family: sans-serif; color: black; position: relative;">
      
      <!-- Header with Logo, Address & Contact -->
      <div style="text-align: center; margin-bottom: 15px;">
        <img src="${ZAWAR_LOGO_BASE64}" style="width: 75px; height: 75px; margin: 0 auto 5px auto; display: block; border-radius: 50%;" />
        <h1 style="margin: 0; font-size: 30px; font-weight: bold; font-family: 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif;" dir="rtl">زوار ٹریڈرز</h1>
        <p style="margin: 2px 0 0; font-size: 14px; font-weight: bold;">Zawar Traders (Wholesale Dealer & General Order Supplier)</p>
        <p style="margin: 3px 0 0; font-size: 13px; font-family: 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif;" dir="rtl">مین جھنگ چنیوٹ روڈ نزد چیزی کرنچ بھوآنہ</p>
        <p style="margin: 3px 0 0; font-size: 13px; font-weight: bold;">رابطہ / WhatsApp: 03457611825</p>
      </div>

      <hr style="border: 0; border-top: 2px solid #000; margin: 15px 0;" />

      <!-- Title & Meta -->
      <div style="text-align: center; margin-bottom: 15px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">${data.title}</h2>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px;">
        <div>
          <p style="margin: 0 0 4px;"><strong>Invoice #:</strong> ${data.refNo || 'Auto'}</p>
          <p style="margin: 0 0 4px;"><strong>Date:</strong> ${data.date}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 4px;"><strong>${data.accountLabel}:</strong> ${data.accountName}</p>
        </div>
      </div>

      <hr style="border: 0; border-top: 1px dashed #000; margin: 15px 0;" />

      <!-- Payment Info -->
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 15px;">
        <div>
          <p style="margin: 0 0 4px;"><strong>Payment Method:</strong> ${data.paymentMethod || 'Cash'}</p>
        </div>
        <div style="border: 1px solid #ccc; padding: 8px; border-radius: 4px; min-width: 250px;">
          <p style="margin: 0 0 4px;"><strong>Bank Details:</strong></p>
          <p style="margin: 0 0 2px;">Account: ${data.accountTitle && data.accountTitle !== '_________________' ? data.accountTitle : '_________________'}</p>
          <p style="margin: 0 0 2px;">Bank: ${data.bankName && data.bankName !== '_________________' ? data.bankName : '_________________'}</p>
          <p style="margin: 0;">A/C No: ${data.accountNumber && data.accountNumber !== '_________________' ? data.accountNumber : '_________________'}</p>
        </div>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 2px solid #000; text-align: left;">
            <th style="padding: 8px 4px;">#</th>
            <th style="padding: 8px 4px;">Item</th>
            <th style="padding: 8px 4px; text-align: center;">Qty</th>
            <th style="padding: 8px 4px; text-align: right;">Rate</th>
            <th style="padding: 8px 4px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.lines.map((l: any, i: number) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 4px;">${i + 1}</td>
              <td style="padding: 8px 4px;">${l.product} ${l.flavor && l.flavor !== 'None' ? '(' + l.flavor + ')' : ''}</td>
              <td style="padding: 8px 4px; text-align: center;">${l.qty}</td>
              <td style="padding: 8px 4px; text-align: right;">${l.rate?.toLocaleString() || "0"}</td>
              <td style="padding: 8px 4px; text-align: right;">${l.total?.toLocaleString() || "0"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals & Khata Summary -->
      <div style="display: flex; justify-content: flex-end; font-size: 13px; margin-bottom: 30px;">
        <div style="width: 320px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Total Items:</span>
            <span>${data.lines.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Total Qty:</span>
            <span>${data.lines.reduce((sum: number, l: any) => sum + (Number(l.qty) || 0), 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Gross Total:</span>
            <span>${data.gross?.toLocaleString() || "0"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Discount:</span>
            <span>${data.discount?.toLocaleString() || "0"}</span>
          </div>
          <hr style="border: 0; border-top: 2px solid #000; margin: 8px 0;" />
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: bold; font-size: 15px;">
            <span>THIS BILL NET:</span>
            <span>${thisBillNet.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Paid Today:</span>
            <span>${paidToday.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Bill Balance:</span>
            <span>${(data.balance)?.toLocaleString() || "0"}</span>
          </div>

          ${prevBal !== null ? `
          <hr style="border: 0; border-top: 1px dashed #000; margin: 10px 0;" />
          <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; margin-bottom: 6px; text-align: center; font-weight: bold; font-size: 12px;">
            کھاتہ سمری (Customer/Supplier Account Summary)
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>سابقہ بقایا (Previous Balance):</span>
            <span>Rs. ${prevBal.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>موجودہ بل (This Bill):</span>
            <span>Rs. ${thisBillNet.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>وصول / ادا شدہ (Paid Today):</span>
            <span>Rs. ${paidToday.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 4px; border-top: 1px solid #ccc; font-weight: bold; font-size: 14px; color: #1e3a8a;">
            <span>کل نیٹ کھاتہ بقایا (Net Balance):</span>
            <span>Rs. ${(calculatedNetBal ?? 0).toLocaleString()}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Signature & Footer -->
      <div style="position: absolute; bottom: 50px; left: 40px; right: 40px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <div>
            <p style="margin: 0 0 4px;">Signature: _______________________</p>
          </div>
          <div style="text-align: right; color: #555;">
            <p style="margin: 0 0 3px; font-family: 'Jameel Noori Nastaleeq', 'Nafees Web Naskh', 'Arial Unicode MS', sans-serif; font-size: 13px;" dir="rtl">نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔</p>
            <p style="margin: 0 0 3px;">Thank you for your business!</p>
            <p style="margin: 0; font-size: 11px;">Software by Ahmad Hassan Tanseel</p>
          </div>
        </div>
      </div>

    </div>
  `;
};
