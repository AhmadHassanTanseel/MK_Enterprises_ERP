import sqlite3

conn = sqlite3.connect('mk.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE invoice_items ADD COLUMN sale_rate REAL DEFAULT 0.0")
    conn.commit()
    print("Column sale_rate added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error: {e}")

conn.close()
