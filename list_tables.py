import sqlite3
import os

path = os.path.expanduser('~\\AppData\\Roaming\\com.business-mgmt-system.dev\\mk_enterprises_v2.db')
c = sqlite3.connect(path)
print([x[0] for x in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()])
