export const getA4InvoiceHtml = (data: any) => {
  return `
    <div style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background: white; font-family: sans-serif; color: black; position: relative;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 32px; font-weight: bold; font-family: 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif;" dir="rtl">میاں خان ٹریڈرز</h1>
        <p style="margin: 5px 0 0; font-size: 14px;" dir="rtl">نزد نیشنل بینک جھنگ چنیوٹ روڈ بھوانہ</p>
        <p style="margin: 5px 0 0; font-size: 14px;" dir="rtl">حاجی میاں خان 5973612-0345</p>
      </div>

      <hr style="border: 0; border-top: 2px solid #000; margin: 20px 0;" />

      <!-- Title & Meta -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">${data.title}</h2>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
        <div>
          <p style="margin: 0 0 5px;"><strong>Invoice #:</strong> ${data.refNo || 'Auto'}</p>
          <p style="margin: 0 0 5px;"><strong>Date:</strong> ${data.date}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 5px;"><strong>${data.accountLabel}:</strong> ${data.accountName}</p>
        </div>
      </div>

      <hr style="border: 0; border-top: 1px dashed #000; margin: 20px 0;" />

      <!-- Payment Info -->
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 20px;">
        <div>
          <p style="margin: 0 0 5px;"><strong>Payment Method:</strong> ${data.paymentMethod || 'Cash'}</p>
        </div>
        <div style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; min-width: 250px;">
          <p style="margin: 0 0 5px;"><strong>For online payment</strong></p>
          <p style="margin: 0 0 3px;">Account: ${data.accountTitle && data.accountTitle !== '_________________' ? data.accountTitle : '_________________'}</p>
          <p style="margin: 0 0 3px;">Bank: ${data.bankName && data.bankName !== '_________________' ? data.bankName : '_________________'}</p>
          <p style="margin: 0;">A/C No: ${data.accountNumber && data.accountNumber !== '_________________' ? data.accountNumber : '_________________'}</p>
        </div>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr style="border-bottom: 2px solid #000; text-align: left;">
            <th style="padding: 10px 5px;">#</th>
            <th style="padding: 10px 5px;">Item</th>
            <th style="padding: 10px 5px; text-align: center;">Qty</th>
            <th style="padding: 10px 5px; text-align: right;">Rate</th>
            <th style="padding: 10px 5px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.lines.map((l: any, i: number) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 5px;">${i + 1}</td>
              <td style="padding: 10px 5px;">${l.product}</td>
              <td style="padding: 10px 5px; text-align: center;">${l.qty}</td>
              <td style="padding: 10px 5px; text-align: right;">${l.rate.toLocaleString()}</td>
              <td style="padding: 10px 5px; text-align: right;">${l.total.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display: flex; justify-content: flex-end; font-size: 14px; margin-bottom: 40px;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Total Items:</span>
            <span>${data.lines.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Total Qty:</span>
            <span>${data.lines.reduce((sum: number, l: any) => sum + (Number(l.qty) || 0), 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Gross Total:</span>
            <span>${data.gross.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Discount:</span>
            <span>${data.discount.toLocaleString()}</span>
          </div>
          <hr style="border: 0; border-top: 2px solid #000; margin: 10px 0;" />
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; font-size: 16px;">
            <span>TOTAL BILL:</span>
            <span>${data.net.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Total Paid:</span>
            <span>${data.paid.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Bakaya:</span>
            <span>${data.balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div style="position: absolute; bottom: 60px; left: 40px; right: 40px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <div>
            <p style="margin: 0 0 5px;">Signature: _______________________</p>
          </div>
          <div style="text-align: right; color: #555;">
            <p style="margin: 0 0 3px;">Thank you for your business!</p>
            <p style="margin: 0; font-size: 12px;">Software by Antigravity</p>
          </div>
        </div>
      </div>

    </div>
  `;
};
