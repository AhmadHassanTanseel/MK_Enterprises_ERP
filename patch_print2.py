import re

with open('src/utils/pdfTemplate.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(r"Software by Antigravity", "Software by Ahmad Hassan Tanseel", code)
code = re.sub(r'<p style="margin: 0 0 3px;">Thank you for your business!</p>', r'''<p style="margin: 0 0 3px; font-family: 'Jameel Noori Nastaleeq', 'Nafees Web Naskh', 'Arial Unicode MS', sans-serif; font-size: 14px;" dir="rtl">نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔</p>\n              <p style="margin: 0 0 3px;">Thank you for your business!</p>''', code)
code = re.sub(r"const name = l\.product_name \|\| \(prod \? prod\.name : 'Unknown Product'\);", r"const name = (l.product_name || (prod ? prod.name : 'Unknown Product')) + (l.flavor ? ` [${l.flavor}]` : '');", code)

with open('src/utils/pdfTemplate.ts', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code2 = f.read()

code2 = re.sub(r"Software by Antigravity", "Software by Ahmad Hassan Tanseel", code2)
code2 = re.sub(r'Thank you for your business!', r'''<div style="font-family: 'Jameel Noori Nastaleeq', 'Nafees Web Naskh', 'Arial Unicode MS', sans-serif; direction: rtl; margin-bottom: 4px;">نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔</div>\n          Thank you for your business!''', code2)
code2 = re.sub(r"const prodName = l\.product_name \|\| \(prod \? prod\.name : 'Unknown'\);", r"const prodName = (l.product_name || (prod ? prod.name : 'Unknown')) + (l.flavor ? ` [${l.flavor}]` : '');", code2)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code2)
