import sqlite3
import os

path = os.path.expanduser('~\\AppData\\Roaming\\com.business-mgmt-system.dev\\mk_enterprises_v2.db')
c = sqlite3.connect(path)
print(c.execute("SELECT sql FROM sqlite_master WHERE name='dispatches'").fetchone()[0])
