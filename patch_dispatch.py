import re

with open('src-tauri/src/sales.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace bind(salesman_id) with bind(if salesman_id == 0 { customer_id } else { salesman_id }) in create_dispatch
old_bind = """    let dispatch_id = sqlx::query(
        "INSERT INTO dispatches (salesman_id, customer_id, dispatch_date, status) VALUES (?, ?, date('now'), 'PENDING')"
    )
    .bind(salesman_id)
    .bind(customer_id)"""

new_bind = """    let actual_salesman_id = if salesman_id == 0 { customer_id } else { salesman_id };
    
    let dispatch_id = sqlx::query(
        "INSERT INTO dispatches (salesman_id, customer_id, dispatch_date, status) VALUES (?, ?, date('now'), 'PENDING')"
    )
    .bind(actual_salesman_id)
    .bind(customer_id)"""

if old_bind in code:
    code = code.replace(old_bind, new_bind)
else:
    print("Could not find the block to replace")

with open('src-tauri/src/sales.rs', 'w', encoding='utf-8') as f:
    f.write(code)
