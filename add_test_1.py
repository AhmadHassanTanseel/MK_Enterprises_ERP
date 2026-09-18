import re

with open('src-tauri/src/sales.rs', 'r') as f:
    code = f.read()

test_code = """
#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    #[tokio::test]
    async fn test_tc_sal_01_bank_settlement() {
        let db_url = "sqlite://../test_mk.db";
        let pool = SqlitePoolOptions::new().connect(db_url).await.unwrap();

        sqlx::query("DELETE FROM journal_entries").execute(&pool).await.unwrap();
        sqlx::query("UPDATE inventory_movements SET quantity=100 WHERE product_id=1").execute(&pool).await.unwrap_or_default();

        let lines = vec![
            SaleLine {
                product_id: 1, 
                quantity: 1,
                unit_price: 100.0,
                discount_percent: None,
                flavor: None,
            }
        ];

        let _ = process_sale_internal(
            1, None, "2026-09-10".into(), lines, 100.0, 0.0, 100.0, 0.0, 100.0, &pool
        ).await;

        let rows: Vec<(i64, f64, f64)> = sqlx::query_as(
            "SELECT account_id, debit, credit FROM journal_entries WHERE voucher_type = 'BANK_RECEIPT'"
        ).fetch_all(&pool).await.unwrap();

        let mut passed = false;
        for (acc, deb, _cred) in &rows {
            if *acc == 99 && *deb == 100.0 {
                passed = true;
            }
        }
        assert!(passed, "TC-SAL-01 FAILED: Bank entry not posted to Account 99. Entries: {:?}", rows);
    }
}
"""

if "#[cfg(test)]" not in code:
    code += "\n" + test_code

with open('src-tauri/src/sales.rs', 'w') as f:
    f.write(code)

print("Added regression test to sales.rs")
