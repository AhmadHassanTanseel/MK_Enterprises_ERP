import sqlite3
db = sqlite3.connect('test_mk.db')
print("Indexes on invoices:")
print(db.execute("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='invoices'").fetchall())

print("Indexes on journal_entries:")
print(db.execute("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='journal_entries'").fetchall())
