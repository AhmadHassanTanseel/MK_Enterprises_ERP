import re

with open('src/shared/layout/MainLayout.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace MK ENTERPRISES in the sidebar
code = re.sub(r'MK ENTERPRISES', r'میاں خان ٹریڈرز', code)

# Replace M K Enterprises in the header
code = re.sub(r'M K Enterprises', r'میاں خان ٹریڈرز', code)

with open('src/shared/layout/MainLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
