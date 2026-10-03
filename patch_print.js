const fs = require('fs');

let code = fs.readFileSync('src/utils/pdfTemplate.ts', 'utf-8');
code = code.replace(/Software by Antigravity/, "Software by Ahmad Hassan Tanseel");
code = code.replace(/<p style="margin: 0 0 3px;">Thank you for your business!<\/p>/, `<p style="margin: 0 0 3px; font-family: 'Jameel Noori Nastaleeq', 'Nafees Web Naskh', 'Arial Unicode MS', sans-serif; font-size: 14px;" dir="rtl">نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔</p>\n              <p style="margin: 0 0 3px;">Thank you for your business!</p>`);
code = code.replace(/const name = l.product_name \|\| \(prod \? prod.name : 'Unknown Product'\);/, "const name = (l.product_name || (prod ? prod.name : 'Unknown Product')) + (l.flavor ? ` [${l.flavor}]` : '');");
fs.writeFileSync('src/utils/pdfTemplate.ts', code, 'utf-8');

let code2 = fs.readFileSync('src/utils/receiptPrinter.ts', 'utf-8');
code2 = code2.replace(/Software by Antigravity/, "Software by Ahmad Hassan Tanseel");
code2 = code2.replace(/Thank you for your business!/, `<div style="font-family: 'Jameel Noori Nastaleeq', 'Nafees Web Naskh', 'Arial Unicode MS', sans-serif; direction: rtl; margin-bottom: 4px;">نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔</div>\n          Thank you for your business!`);
code2 = code2.replace(/const prodName = l.product_name \|\| \(prod \? prod.name : 'Unknown'\);/, "const prodName = (l.product_name || (prod ? prod.name : 'Unknown')) + (l.flavor ? ` [${l.flavor}]` : '');");
fs.writeFileSync('src/utils/receiptPrinter.ts', code2, 'utf-8');
