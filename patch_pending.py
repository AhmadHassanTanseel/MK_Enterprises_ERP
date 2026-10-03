import re

with open('src/features/sales/PendingOrdersPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("onChange={(v) => setNewSalesmanId(v || 0)}", "onChange={setNewSalesmanId}")
code = code.replace("onChange={(v) => setNewCustomerId(v || 0)}", "onChange={setNewCustomerId}")

# We should also ensure we don't send null as i64 to Rust if it's not selected.
# Wait, if newSalesmanId is null, but they try to dispatch, we should block it!
# Let's add validation in handleCreateDispatch:

old_dispatch = """      if (validLines.length === 0) return toast.error('Add at least one product');"""
new_dispatch = """      if (validLines.length === 0) return toast.error('Add at least one product');
      if (dispatchType === 'salesman' && !newSalesmanId) return toast.error('Salesman is required');
      if (dispatchType === 'customer' && !newCustomerId) return toast.error('Buyer is required');"""

if old_dispatch in code:
    code = code.replace(old_dispatch, new_dispatch)

with open('src/features/sales/PendingOrdersPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
