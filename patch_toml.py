import re

with open('src-tauri/Cargo.toml', 'r', encoding='utf-8') as f:
    code = f.read()

if 'machine-uid' not in code:
    code = code.replace(
        '[dependencies]',
        '[dependencies]\nmachine-uid = "0.6.0"'
    )

with open('src-tauri/Cargo.toml', 'w', encoding='utf-8') as f:
    f.write(code)
