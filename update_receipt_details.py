import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Update Header section
header_pattern = r"<!-- Header -->[\s\S]*?<!-- Transaction Meta -->"

new_header = """<!-- Header -->
      <div class="text-center mb-2">
        <div class="urdu-title">میاں خان ٹریڈرز</div>
        <div style="font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif; font-size: 14px; direction: rtl;">نزد نیشنل بینک جھنگ چنیوٹ روڈ بھوانہ</div>
        <div style="font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif; font-size: 14px; direction: rtl;">حاجی میاں خان 5973612-0345</div>
      </div>
      
      <!-- Transaction Meta -->"""

code = re.sub(header_pattern, new_header, code)

# Change "User Munshi" to "Signature"
sig_pattern = r"<span class=\"font-bold\">User Munshi:</span> \$\{data\.staffName \|\| '_________________'\}"
new_sig = """<span class="font-bold">Signature:</span> _________________ <span style="margin-left:10px;">${data.staffName ? '(' + data.staffName + ')' : ''}</span>"""

code = re.sub(sig_pattern, new_sig, code)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
