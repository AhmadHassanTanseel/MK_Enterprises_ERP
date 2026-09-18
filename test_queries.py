import sqlite3
import os

app_data = os.getenv('APPDATA')
db_path = os.path.join(app_data, 'com.business-mgmt-system.dev', 'mk_enterprises_v2.db')
conn = sqlite3.connect(db_path)

queries = {
    "get_categories": "SELECT id, name, description, parent_id, margin_target, flavor FROM categories ORDER BY name ASC",
    "get_products": "SELECT id, code, name, packing, purchase_price, sale_price, opening_stock, flavors, category_id, real_barcode, uom, reorder_level, sale_account_id FROM products ORDER BY id DESC",
    "get_live_stock": "SELECT p.id as product_id, p.code, p.name, COALESCE(SUM(im.quantity), 0) as available_stock, COALESCE(SUM(im.quantity), 0) * p.purchase_price as stock_value FROM products p LEFT JOIN inventory_movements im ON p.id = im.product_id GROUP BY p.id ORDER BY p.name ASC",
    "get_all_ledger_entries": "SELECT id, datetime(entry_date, 'localtime') as date, account_id, debit as dr_amount, credit as cr_amount, narration as description, reference_id as ref_id, voucher_type as ref_type FROM journal_entries ORDER BY id ASC",
    "get_accounts": "SELECT id, account_type_id, name, contact, area_id, opening_balance, opening_balance_type, is_customer, is_supplier, datetime(created_at, 'localtime') as created_at FROM accounts ORDER BY name ASC",
    "get_areas": "SELECT id, name, salesman_id, remarks, active, account_count FROM areas ORDER BY name ASC",
    "get_account_types": "SELECT id, name, nature, trial_bal_type, trial_order FROM account_types ORDER BY trial_order ASC",
    "get_invoices": "SELECT id, invoice_type as type, invoice_number as ref_no, account_id, salesman_id, datetime(invoice_date, 'localtime') as date, gross_amount, discount_amount, net_amount, amount_paid FROM invoices ORDER BY id DESC",
    "get_settings": "SELECT setting_key as key, setting_value as value FROM settings",
    "get_salesmen": "SELECT id, name, contact, salary, details, status FROM accounts WHERE account_type_id = 7 ORDER BY name ASC",
}

for name, query in queries.items():
    try:
        conn.execute(query).fetchall()
        print(f"[OK] {name}")
    except Exception as e:
        print(f"[FAIL] {name}: {e}")

conn.close()
