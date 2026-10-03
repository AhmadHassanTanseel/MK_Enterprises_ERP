import re

with open('src/utils/pdfTemplate.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Update product name to include flavor
old_name = """const name = l.product_name || (prod ? prod.name : 'Unknown Product');"""
new_name = """const name = (l.product_name || (prod ? prod.name : 'Unknown Product')) + (l.flavor ? ` [${l.flavor}]` : '');"""
code = code.replace(old_name, new_name)

# Update footer and add Urdu note
old_footer = """            <div style="text-align: right; color: #555;">
              <p style="margin: 0 0 3px;">Thank you for your business!</p>
              <p style="margin: 0; font-size: 12px;">Software by Antigravity</p>
            </div>"""
new_footer = """            <div style="text-align: right; color: #555;">
              <p style="margin: 0 0 3px; font-family: 'Jameel Noori Nastaleeq', 'Nafees Web Naskh', 'Arial Unicode MS', sans-serif; font-size: 14px;" dir="rtl">
                نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔
              </p>
              <p style="margin: 0 0 3px;">Thank you for your business!</p>
              <p style="margin: 0; font-size: 12px;">Software by Ahmad Hassan Tanseel</p>
            </div>"""
code = code.replace(old_footer, new_footer)

with open('src/utils/pdfTemplate.ts', 'w', encoding='utf-8') as f:
    f.write(code)


with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code2 = f.read()

# Update item name for receipt
old_name2 = """const prodName = l.product_name || (prod ? prod.name : 'Unknown');"""
new_name2 = """const prodName = (l.product_name || (prod ? prod.name : 'Unknown')) + (l.flavor ? ` [${l.flavor}]` : '');"""
code2 = code2.replace(old_name2, new_name2)

# Update footer for receipt
old_footer2 = """        <div class="text-center mt-2 border-top" style="padding-top: 6px; font-size: 10px;">
          Thank you for your business!
          <br/>
          Software by Antigravity
        </div>"""
new_footer2 = """        <div class="text-center mt-2 border-top" style="padding-top: 6px; font-size: 11px;">
          <div style="font-family: 'Jameel Noori Nastaleeq', 'Nafees Web Naskh', 'Arial Unicode MS', sans-serif; direction: rtl; margin-bottom: 4px;">
            نوٹ: کھلے اور خراب ہونے والے پروڈکٹس اور رسید کے بغیر پروڈکٹ کا کوئی کلیم نہیں ہوگا۔
          </div>
          Thank you for your business!
          <br/>
          Software by Ahmad Hassan Tanseel
        </div>"""
code2 = code2.replace(old_footer2, new_footer2)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code2)
