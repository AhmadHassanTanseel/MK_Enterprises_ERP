import sqlite3
db = sqlite3.connect('test_mk.db')
print("CREATE TABLE invoices:")
print(db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND tbl_name='invoices'").fetchall()[0][0])
