import sqlite3
import os

app_data = os.getenv('APPDATA')
db_path = os.path.join(app_data, 'com.business-mgmt-system.dev', 'mk_enterprises_v2.db')

if not os.path.exists(db_path):
    print("DB not found at", db_path)
    # try localappdata
    db_path = os.path.join(os.getenv('LOCALAPPDATA'), 'com.business-mgmt-system.dev', 'mk_enterprises_v2.db')
    if not os.path.exists(db_path):
        print("DB not found at", db_path)
        exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT * FROM products")
print(cursor.fetchall())
conn.close()
