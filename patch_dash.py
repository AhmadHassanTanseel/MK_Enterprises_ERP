import re

with open('src/features/dashboard/Dashboard.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_array = r"""  const quickNav = \[
    \{ label: "Payables & Receivables", icon: UsersIcon, to: "/other-accounts\?tab=payables_receivables", color: "bg-emerald-100 text-emerald-700" \},
    \{ label: "Sales Invoice", icon: FileText, to: "/sales", color: "bg-blue-100 text-blue-700" \},
    \{ label: "Purchase", icon: ShoppingCart, to: "/purchases", color: "bg-teal-100 text-teal-700" \},"""

new_array = """  const quickNav = [
    { label: "Sales Invoice", icon: FileText, to: "/sales", color: "bg-blue-100 text-blue-700" },
    { label: "Purchase", icon: ShoppingCart, to: "/purchases", color: "bg-teal-100 text-teal-700" },
    { label: "Payables & Receivables", icon: UsersIcon, to: "/other-accounts?tab=payables_receivables", color: "bg-emerald-100 text-emerald-700" },"""

code = re.sub(old_array, new_array, code)

with open('src/features/dashboard/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
