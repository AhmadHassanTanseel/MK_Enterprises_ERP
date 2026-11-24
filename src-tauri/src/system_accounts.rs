use sqlx::{SqlitePool, SqliteConnection};

pub struct SystemAccounts {
    pub cash: i64,
    pub bank: i64,
    pub sales_revenue: i64,
    pub purchases: i64,
    pub damage_loss: i64,
    pub inventory: i64,
    pub operating_expense: i64,
    pub opening_balance_equity: i64,
    pub sales_discount: i64,
}

pub async fn config_account_id(pool: &SqlitePool, key: &str, default: i64) -> Result<i64, String> {
    let val: Option<String> = sqlx::query_scalar("SELECT value FROM system_config WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    match val {
        Some(v) => v
            .parse()
            .map_err(|_| format!("Invalid numeric value for system_config key '{}'", key)),
        None => Ok(default),
    }
}

pub async fn config_account_id_conn(conn: &mut SqliteConnection, key: &str, default: i64) -> Result<i64, String> {
    let val: Option<String> = sqlx::query_scalar("SELECT value FROM system_config WHERE key = ?")
        .bind(key)
        .fetch_optional(conn)
        .await
        .map_err(|e| e.to_string())?;

    match val {
        Some(v) => v
            .parse()
            .map_err(|_| format!("Invalid numeric value for system_config key '{}'", key)),
        None => Ok(default),
    }
}

pub async fn get_system_accounts(pool: &SqlitePool) -> Result<SystemAccounts, String> {
    Ok(SystemAccounts {
        cash: config_account_id(pool, "cash_account_id", 1).await?,
        bank: config_account_id(pool, "bank_account_id", 16).await?,
        sales_revenue: config_account_id(pool, "sales_revenue_account_id", 3).await?,
        purchases: config_account_id(pool, "purchases_account_id", 4).await?,
        damage_loss: config_account_id(pool, "damage_loss_account_id", 5).await?,
        inventory: config_account_id(pool, "inventory_account_id", 6).await?,
        operating_expense: config_account_id(pool, "operating_expense_account_id", 7).await?,
        opening_balance_equity: config_account_id(pool, "opening_balance_equity_account_id", 8).await?,
        sales_discount: config_account_id(pool, "sales_discount_account_id", 9).await?,
    })
}

pub async fn assert_tx_balanced(conn: &mut SqliteConnection, ref_no: &str) -> Result<(), String> {
    let row: (f64, f64) = sqlx::query_as(
        "SELECT COALESCE(SUM(debit), 0.0), COALESCE(SUM(credit), 0.0) FROM journal_entries WHERE ref_no = ?"
    )
    .bind(ref_no)
    .fetch_one(conn)
    .await
    .map_err(|e| e.to_string())?;

    let (sum_dr, sum_cr) = row;
    if (sum_dr - sum_cr).abs() > 0.001 || sum_dr <= 0.0 {
        return Err(format!(
            "ERR_UNBALANCED_TRANSACTION: Ref {} is unbalanced! Total Dr: {:.2}, Total Cr: {:.2}, Imbalance: {:.2}",
            ref_no, sum_dr, sum_cr, (sum_dr - sum_cr).abs()
        ));
    }
    Ok(())
}
