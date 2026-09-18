import re

with open('src-tauri/src/reporting.rs', 'r', encoding='utf-8') as f:
    code = f.read()

old_code = """    // Add fixed liabilities to total expenses
    exp += fixed_liabilities_total;

    let net_profit = rev - exp;"""

new_code = """    // Add fixed liabilities to total expenses and total liabilities to keep balance sheet balanced
    exp += fixed_liabilities_total;
    lia += fixed_liabilities_total;

    let net_profit = rev - exp;"""

code = code.replace(old_code, new_code)

with open('src-tauri/src/reporting.rs', 'w', encoding='utf-8') as f:
    f.write(code)
