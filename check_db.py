import sqlite3

c = sqlite3.connect('src-tauri/mk_enterprises_v2.db')
print(c.execute("SELECT sql FROM sqlite_master WHERE name='dispatches'").fetchone()[0])
