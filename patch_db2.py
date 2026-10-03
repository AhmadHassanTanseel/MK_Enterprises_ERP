import re

with open('src-tauri/src/sales.rs', 'r', encoding='utf-8') as f:
    sales_code = f.read()

# In settle_dispatch:
# 1. sale_lines.push((line.product_id, line.qty_sold, line.unit_price, line.discount_percent));
# change to push a 5-tuple, need to fetch flavor first.
# Wait, `SettleLine` has `dispatch_item_id`. We can query flavor using `dispatch_item_id`.

# Wait! It's much easier to just do:
# let flavor: Option<String> = sqlx::query_scalar("SELECT flavor FROM dispatch_items WHERE id = ?").bind(line.dispatch_item_id).fetch_optional(&mut *tx).await.unwrap_or(None);
# And push it.

# Let's see the loop where it pushes:
old_loop_push = """        if line.qty_sold > 0 {
            let gross = (line.qty_sold as f64) * line.unit_price;
            let discount = gross * (line.discount_percent / 100.0);
            total_gross += gross;
            total_discount += discount;
            sale_lines.push((line.product_id, line.qty_sold, line.unit_price, line.discount_percent));
        }"""

new_loop_push = """        if line.qty_sold > 0 {
            let gross = (line.qty_sold as f64) * line.unit_price;
            let discount = gross * (line.discount_percent / 100.0);
            total_gross += gross;
            total_discount += discount;
            let flavor: Option<String> = sqlx::query_scalar("SELECT flavor FROM dispatch_items WHERE id = ?").bind(line.dispatch_item_id).fetch_optional(&mut *tx).await.unwrap_or_default();
            sale_lines.push((line.product_id, line.qty_sold, line.unit_price, line.discount_percent, flavor));
        }"""

sales_code = sales_code.replace(old_loop_push, new_loop_push)

old_loop_insert = """        for (pid, qty, price, disc) in sale_lines {
            let total_price = (qty as f64) * price * (1.0 - (disc / 100.0));
            sqlx::query(
                "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(invoice_id).bind(pid).bind(qty).bind(price).bind(disc).bind(total_price)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }"""

new_loop_insert = """        for (pid, qty, price, disc, flavor) in sale_lines {
            let total_price = (qty as f64) * price * (1.0 - (disc / 100.0));
            sqlx::query(
                "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, total_price, flavor) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(invoice_id).bind(pid).bind(qty).bind(price).bind(disc).bind(total_price).bind(flavor)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }"""

sales_code = sales_code.replace(old_loop_insert, new_loop_insert)

with open('src-tauri/src/sales.rs', 'w', encoding='utf-8') as f:
    f.write(sales_code)
print("Patched settle_dispatch")
