import sqlite3
import os

app_data = os.getenv('APPDATA')
db_path = os.path.join(app_data, 'com.business-mgmt-system.dev', 'mk_enterprises_v2.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(products)")
for r in cursor.fetchall():
    print(r)
conn.close()
