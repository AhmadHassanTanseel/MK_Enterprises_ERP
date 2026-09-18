import sqlite3
import os

app_data = os.getenv('APPDATA')
db_path = os.path.join(app_data, 'com.business-mgmt-system.dev', 'mk_enterprises_v2.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_col(table, col, dtype):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}")
        print(f"Added {col} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            pass
        else:
            print(f"Error adding {col} to {table}: {e}")

# Categories
add_col("categories", "parent_id", "INTEGER")
add_col("categories", "flavor", "TEXT")
add_col("categories", "margin_target", "REAL")

# Areas
add_col("areas", "active", "INTEGER DEFAULT 1")
add_col("areas", "account_count", "INTEGER DEFAULT 0")

# Invoices
add_col("invoices", "amount_paid", "REAL DEFAULT 0.0")

# Accounts (for salesmen)
add_col("accounts", "salary", "REAL DEFAULT 0.0")
add_col("accounts", "details", "TEXT")
add_col("accounts", "status", "TEXT DEFAULT 'ACTIVE'")

conn.commit()
conn.close()
print("Database schema patched!")
