use app_lib::sales::{process_sale_internal, SaleLine};
use sqlx::sqlite::SqlitePoolOptions;
use std::sync::Arc;
use tokio::task;

#[tokio::main]
async fn main() {
    let db_url = "sqlite://../test_mk.db";
    let pool = Arc::new(SqlitePoolOptions::new().max_connections(50).connect(db_url).await.unwrap());

    sqlx::query("DELETE FROM journal_entries").execute(&*pool).await.unwrap();
    sqlx::query("DELETE FROM invoice_items").execute(&*pool).await.unwrap();
    sqlx::query("DELETE FROM invoices").execute(&*pool).await.unwrap();
    sqlx::query("DELETE FROM inventory_movements").execute(&*pool).await.unwrap();
    sqlx::query("INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_id) VALUES (1, 1, 'OPENING', 0)").execute(&*pool).await.unwrap();

    let mut handles = vec![];

    // Spawn 50 simultaneous attempts to buy the single item
    for _ in 0..50 {
        let pool_clone = Arc::clone(&pool);
        let handle = task::spawn(async move {
            let lines = vec![
                SaleLine {
                    product_id: 1, 
                    quantity: 1,
                    unit_price: 100.0,
                    discount_percent: None,
                    flavor: None,
                }
            ];

            let res = process_sale_internal(
                1, None, None, "2026-09-10".into(), lines, 100.0, 0.0, 100.0, 100.0, 0.0, &pool_clone
            ).await;
            res.is_ok()
        });
        handles.push(handle);
    }

    let mut successes = 0;
    for handle in handles {
        if handle.await.unwrap() {
            successes += 1;
        }
    }
    
    let stock_row: (i64,) = sqlx::query_as("SELECT COALESCE(SUM(quantity), 0) FROM inventory_movements WHERE product_id = 1")
        .fetch_one(&*pool).await.unwrap();

    println!("Total successful sales: {}/50", successes);
    println!("Final stock: {}", stock_row.0);
}
