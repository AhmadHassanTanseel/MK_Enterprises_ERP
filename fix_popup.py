import re

with open('src/utils/receiptPrinter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the window.open block with an iframe block
pattern = r"const printWindow = window\.open\('', '_blank', 'width=400,height=600'\);[\s\S]*?const html ="

iframe_setup = """const iframe = document.createElement('iframe');
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
  
  const html ="""

code = re.sub(pattern, iframe_setup, code)

# Replace the closing block
pattern_close = r"printWindow\.document\.write\(html\);[\s\S]*?toast\.success\('Sent to Thermal Printer!'\);\n  \}, 250\);"

iframe_close = """doc.open();
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
  }"""

code = re.sub(pattern_close, iframe_close, code)

with open('src/utils/receiptPrinter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
