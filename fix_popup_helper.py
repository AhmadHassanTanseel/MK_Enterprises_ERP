import re

with open('src/utils/printHelper.ts', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"const printWindow = window\.open\('', '_blank', 'width=800,height=600'\);[\s\S]*?printWindow\.document\.write\(`"

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
    toast.error(`Could not prepare ${title} for printing: Iframe failed.`);
    document.body.removeChild(iframe);
    return;
  }
  
  doc.open();
  doc.write(`"""

code = re.sub(pattern, iframe_setup, code)

pattern_close = r"printWindow\.document\.close\(\);[\s\S]*?toast\.success\(`Sending \$\{title\} to printer\.\.\.`\);\n  \}, 250\);"

iframe_close = """doc.close();
  
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
  }"""

code = re.sub(pattern_close, iframe_close, code)

with open('src/utils/printHelper.ts', 'w', encoding='utf-8') as f:
    f.write(code)
