use app_lib::sales::{process_sale_internal, SaleLine};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::main]
async fn main() {
    let db_url = "sqlite://../test_mk.db";
    let pool = SqlitePoolOptions::new().connect(db_url).await.unwrap();

    let lines = vec![
        SaleLine {
            product_id: 1, 
            quantity: 1,
            unit_price: 100.0,
            discount_percent: None,
            flavor: None,
        }
    ];

    sqlx::query("DELETE FROM journal_entries").execute(&pool).await.unwrap();
    sqlx::query("UPDATE inventory_movements SET quantity=100 WHERE product_id=1").execute(&pool).await.unwrap_or_default();

    let res = process_sale_internal(
        1, 
        None, // salesman_id
        None,
        "2026-09-10".into(),
        lines,
        100.0,
        0.0,
        100.0,
        0.0,   
        100.0, 
        &pool,
    ).await;

    println!("Process Sale Result: {:?}", res);

    let rows: Vec<(i64, f64, f64)> = sqlx::query_as(
        "SELECT account_id, debit, credit FROM journal_entries WHERE voucher_type = 'BANK_RECEIPT'"
    ).fetch_all(&pool).await.unwrap();

    let mut passed = false;
    for (acc, deb, _cred) in &rows {
        if *acc == 99 && *deb == 100.0 {
            passed = true;
        }
    }
    
    if passed {
        println!("TC-SAL-01 PASS");
    } else {
        println!("TC-SAL-01 FAIL (Bank entries: {:?})", rows);
    }
}
