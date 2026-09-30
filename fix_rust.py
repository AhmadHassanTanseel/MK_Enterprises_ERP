import re

# Fix lib.rs
with open('src-tauri/src/lib.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Revert the bad import
bad_import = """use treasury::{process_cash_transaction, process_journal_voucher,
            get_workers,
            get_attendance,
            mark_attendance, get_cash_transaction_history, get_journal_vouchers, get_ledger_entries_by_ref};"""
code = code.replace(bad_import, "use treasury::*;")

# Add the commands to generate_handler!
code = code.replace("process_journal_voucher,", "process_journal_voucher,\n            get_workers,\n            get_attendance,\n            mark_attendance,")

with open('src-tauri/src/lib.rs', 'w', encoding='utf-8') as f:
    f.write(code)

# Fix attendance.rs
with open('src-tauri/src/attendance.rs', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("use crate::AppState;\n", "use tauri::State;\n")
code = code.replace("state: tauri::State<'_, AppState>", "db: State<'_, SqlitePool>")
code = code.replace("let pool = state.db.lock().await;", "let pool = db.inner();")
code = code.replace("let pool = db.lock().await;", "let pool = db.inner();")

with open('src-tauri/src/attendance.rs', 'w', encoding='utf-8') as f:
    f.write(code)
