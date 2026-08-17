use sqlx::SqlitePool;

pub struct SystemAccounts {
    pub cash: i64,
    pub sales_revenue: i64,
    pub purchases: i64,
    pub damage_loss: i64,
}

async fn config_account_id(pool: &SqlitePool, key: &str, default: i64) -> Result<i64, String> {
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

pub async fn get_system_accounts(pool: &SqlitePool) -> Result<SystemAccounts, String> {
    Ok(SystemAccounts {
        cash: config_account_id(pool, "cash_account_id", 1).await?,
        sales_revenue: config_account_id(pool, "sales_revenue_account_id", 3).await?,
        purchases: config_account_id(pool, "purchases_account_id", 4).await?,
        damage_loss: config_account_id(pool, "damage_loss_account_id", 5).await?,
    })
}
