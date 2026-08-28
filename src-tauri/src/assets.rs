use serde::{Deserialize, Serialize};
use tauri::State;
use sqlx::{SqlitePool, Row};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompanyAsset {
    pub id: i64,
    pub name: String,
    pub purchase_date: String,
    pub purchase_price: f64,
    pub status: String,
    pub sold_date: Option<String>,
    pub sold_price: Option<f64>,
}

#[tauri::command]
pub async fn get_company_assets(pool: State<'_, SqlitePool>) -> Result<Vec<CompanyAsset>, String> {
    let records = sqlx::query(
        r#"
        SELECT id, name, purchase_date, purchase_price, status, sold_date, sold_price 
        FROM company_assets 
        ORDER BY id DESC
        "#
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut assets = Vec::new();
    for r in records {
        assets.push(CompanyAsset {
            id: r.try_get("id").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            purchase_date: r.try_get("purchase_date").unwrap_or_default(),
            purchase_price: r.try_get("purchase_price").unwrap_or(0.0),
            status: r.try_get("status").unwrap_or_default(),
            sold_date: r.try_get("sold_date").unwrap_or(None),
            sold_price: r.try_get("sold_price").unwrap_or(None),
        });
    }
    Ok(assets)
}

#[tauri::command]
pub async fn add_company_asset(
    pool: State<'_, SqlitePool>,
    name: String,
    purchase_price: f64,
    purchase_date: String,
) -> Result<i64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let result = sqlx::query(
        r#"
        INSERT INTO company_assets (name, purchase_date, purchase_price, status)
        VALUES (?, ?, ?, 'ACTIVE')
        "#
    )
    .bind(&name)
    .bind(&purchase_date)
    .bind(purchase_price)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    
    let asset_id = result.last_insert_rowid();

    let asset_acc = sqlx::query("SELECT id FROM accounts WHERE name = 'Company Assets'")
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        
    let acc_id: i64 = if let Some(acc) = asset_acc {
        acc.try_get("id").unwrap_or(0)
    } else {
        sqlx::query("INSERT OR IGNORE INTO account_types (id, name, nature, trial_bal_type, trial_order) VALUES (9, 'Fixed Assets', 'ASSET', 'DEBIT', 9)")
            .execute(&mut *tx).await.ok();
            
        let res = sqlx::query("INSERT INTO accounts (account_type_id, name) VALUES (9, 'Company Assets')")
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
        res.last_insert_rowid()
    };
    
    sqlx::query(
        "INSERT INTO journal_entries (entry_date, account_id, debit, credit, narration, voucher_type, reference_id) VALUES (?, ?, ?, 0.0, ?, 'JOURNAL_VOUCHER', ?)"
    )
    .bind(&purchase_date).bind(acc_id).bind(purchase_price).bind(&name).bind(asset_id)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    
    sqlx::query(
        "INSERT INTO journal_entries (entry_date, account_id, debit, credit, narration, voucher_type, reference_id) VALUES (?, 1, 0.0, ?, ?, 'JOURNAL_VOUCHER', ?)"
    )
    .bind(&purchase_date).bind(purchase_price).bind(&name).bind(asset_id)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(asset_id)
}

#[tauri::command]
pub async fn sell_company_asset(
    pool: State<'_, SqlitePool>,
    id: i64,
    sold_price: f64,
    sold_date: String,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let asset_row = sqlx::query(
        "SELECT name, purchase_price FROM company_assets WHERE id = ?"
    )
    .bind(id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let asset_name: String = asset_row.try_get("name").unwrap_or_default();
    let asset_purchase_price: f64 = asset_row.try_get("purchase_price").unwrap_or(0.0);

    sqlx::query(
        r#"
        UPDATE company_assets 
        SET status = 'SOLD', sold_date = ?, sold_price = ?
        WHERE id = ?
        "#
    )
    .bind(&sold_date).bind(sold_price).bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let asset_acc = sqlx::query("SELECT id FROM accounts WHERE name = 'Company Assets'")
        .fetch_one(&mut *tx).await.map_err(|e| e.to_string())?;
        
    let acc_id: i64 = asset_acc.try_get("id").unwrap_or(0);
    let desc = format!("Sold Asset: {}", asset_name);
    
    sqlx::query(
        "INSERT INTO journal_entries (entry_date, account_id, debit, credit, narration, voucher_type, reference_id) VALUES (?, 1, ?, 0.0, ?, 'JOURNAL_VOUCHER', ?)"
    )
    .bind(&sold_date).bind(sold_price).bind(&desc).bind(id)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    
    sqlx::query(
        "INSERT INTO journal_entries (entry_date, account_id, debit, credit, narration, voucher_type, reference_id) VALUES (?, ?, 0.0, ?, ?, 'JOURNAL_VOUCHER', ?)"
    )
    .bind(&sold_date).bind(acc_id).bind(asset_purchase_price).bind(&desc).bind(id)
    .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    
    if sold_price > asset_purchase_price {
        let profit = sold_price - asset_purchase_price;
        let pl_acc = sqlx::query("SELECT id FROM accounts WHERE name = 'Profit on Asset Sale'")
            .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
        
        let pl_id: i64 = if let Some(a) = pl_acc { 
            a.try_get("id").unwrap_or(0) 
        } else {
            sqlx::query("INSERT OR IGNORE INTO account_types (id, name, nature, trial_bal_type, trial_order) VALUES (10, 'Other Income', 'INCOME', 'CREDIT', 10)")
                .execute(&mut *tx).await.ok();
            let r = sqlx::query("INSERT INTO accounts (account_type_id, name) VALUES (10, 'Profit on Asset Sale')")
                .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            r.last_insert_rowid()
        };

        sqlx::query(
            "INSERT INTO journal_entries (entry_date, account_id, debit, credit, narration, voucher_type, reference_id) VALUES (?, ?, 0.0, ?, ?, 'JOURNAL_VOUCHER', ?)"
        )
        .bind(&sold_date).bind(pl_id).bind(profit).bind(&desc).bind(id)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    } else if sold_price < asset_purchase_price {
        let loss = asset_purchase_price - sold_price;
        let loss_acc = sqlx::query("SELECT id FROM accounts WHERE name = 'Loss on Asset Sale'")
            .fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
        
        let loss_id: i64 = if let Some(a) = loss_acc { 
            a.try_get("id").unwrap_or(0) 
        } else {
            sqlx::query("INSERT OR IGNORE INTO account_types (id, name, nature, trial_bal_type, trial_order) VALUES (11, 'Other Expense', 'EXPENSE', 'DEBIT', 11)")
                .execute(&mut *tx).await.ok();
            let r = sqlx::query("INSERT INTO accounts (account_type_id, name) VALUES (11, 'Loss on Asset Sale')")
                .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            r.last_insert_rowid()
        };
        
        sqlx::query(
            "INSERT INTO journal_entries (entry_date, account_id, debit, credit, narration, voucher_type, reference_id) VALUES (?, ?, ?, 0.0, ?, 'JOURNAL_VOUCHER', ?)"
        )
        .bind(&sold_date).bind(loss_id).bind(loss).bind(&desc).bind(id)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}
