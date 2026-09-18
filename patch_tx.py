import re
with open('src-tauri/src/sales.rs', 'r') as f:
    code = f.read()

code = code.replace("let mut tx = db.begin().await.map_err(|e| e.to_string())?;", "let mut tx = db.begin().await.map_err(|e| e.to_string())?;\n    let _ = sqlx::query(\"BEGIN IMMEDIATE\").execute(&mut *tx).await;")

with open('src-tauri/src/sales.rs', 'w') as f:
    f.write(code)

with open('src-tauri/src/procurement.rs', 'r') as f:
    code = f.read()

code = code.replace("let mut tx = db.begin().await.map_err(|e| e.to_string())?;", "let mut tx = db.begin().await.map_err(|e| e.to_string())?;\n    let _ = sqlx::query(\"BEGIN IMMEDIATE\").execute(&mut *tx).await;")

with open('src-tauri/src/procurement.rs', 'w') as f:
    f.write(code)

print("Added BEGIN IMMEDIATE to transactions")
