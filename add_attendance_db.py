import re
import os

with open('src-tauri/src/database.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add attendance table
schema_new = """CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            remarks TEXT,
            FOREIGN KEY(account_id) REFERENCES accounts(id),
            UNIQUE(account_id, date)
        );"""
code = code.replace("CREATE TABLE IF NOT EXISTS system_config (\n            key TEXT PRIMARY KEY,\n            value TEXT NOT NULL\n        );", schema_new)

# 2. Add Employee account type
acc_types = """(8, 'Damaged Goods Expense', 'EXPENSE', 'DEBIT', 8),
        (14, 'Salesman', 'ASSET', 'DEBIT', 14),
        (15, 'Staff / Employee', 'LIABILITY', 'CREDIT', 15);"""
code = code.replace("(8, 'Damaged Goods Expense', 'EXPENSE', 'DEBIT', 8),\n        (14, 'Salesman', 'ASSET', 'DEBIT', 14);", acc_types)

with open('src-tauri/src/database.rs', 'w', encoding='utf-8') as f:
    f.write(code)
