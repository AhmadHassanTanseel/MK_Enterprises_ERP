import re

with open('src/app/context/AppContext.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace discount_percent: l.discount_pct with discount_percent: l.discount_pct, sale_rate: l.sale_rate
# But only for process_purchase.

pattern_purchase = r"await invoke\('process_purchase', \{.*?lines: invoiceData\.lines\.map\(l => \(\{.*?discount_percent: l\.discount_pct\s*\}\)\),"
match_purchase = re.search(pattern_purchase, code, re.DOTALL)
if match_purchase:
    s = match_purchase.group(0)
    # replace the inner `discount_percent: l.discount_pct` with `discount_percent: l.discount_pct, sale_rate: l.sale_rate, flavor: l.flavor`
    s_new = s.replace('discount_percent: l.discount_pct', 'discount_percent: l.discount_pct, sale_rate: l.sale_rate, flavor: l.flavor')
    code = code.replace(s, s_new)

pattern_sale = r"await invoke\('process_sale', \{.*?lines: invoiceData\.lines\.map\(l => \(\{.*?discount_percent: l\.discount_pct\s*\}\)\),"
match_sale = re.search(pattern_sale, code, re.DOTALL)
if match_sale:
    s = match_sale.group(0)
    s_new = s.replace('discount_percent: l.discount_pct', 'discount_percent: l.discount_pct, flavor: l.flavor')
    code = code.replace(s, s_new)

with open('src/app/context/AppContext.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
