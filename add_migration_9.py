import re

with open('src-tauri/src/database.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Add to run_migrations
old_run = """    if current < 8 {
        migration_008_fix_missing_columns(pool).await?;
        record_migration(pool, 8).await?;
    }"""

new_run = """    if current < 8 {
        migration_008_fix_missing_columns(pool).await?;
        record_migration(pool, 8).await?;
    }
    
    if current < 9 {
        migration_009_sale_rate(pool).await?;
        record_migration(pool, 9).await?;
    }"""

code = code.replace(old_run, new_run)

# Add the function
func = """
async fn migration_009_sale_rate(pool: &sqlx::SqlitePool) -> Result<(), String> {
    if !column_exists(pool, "invoice_items", "sale_rate").await? {
        sqlx::query("ALTER TABLE invoice_items ADD COLUMN sale_rate REAL DEFAULT 0.0").execute(pool).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}
"""

code += func

with open('src-tauri/src/database.rs', 'w', encoding='utf-8') as f:
    f.write(code)
