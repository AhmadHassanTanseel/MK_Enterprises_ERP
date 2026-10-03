import re

with open('src-tauri/src/reporting.rs', 'r', encoding='utf-8') as f:
    code = f.read()

old_func = """pub async fn get_financial_summary(db: State<'_, SqlitePool>) -> Result<FinancialSummary, String> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    let rows = sqlx::query(
        r#"
        SELECT at.nature, SUM(je.debit) as total_debit, SUM(je.credit) as total_credit
        FROM journal_entries je
        JOIN accounts a ON a.id = je.account_id
        JOIN account_types at ON at.id = a.account_type_id
        GROUP BY at.nature
        "#
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;"""

new_func = """pub async fn get_financial_summary(
    start_date: Option<String>,
    end_date: Option<String>,
    db: State<'_, SqlitePool>
) -> Result<FinancialSummary, String> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    // Default dates if none provided
    let sd = start_date.unwrap_or_else(|| "1970-01-01".to_string());
    let ed = end_date.unwrap_or_else(|| "2999-12-31".to_string());

    // For Revenue and Expenses, we use the date range.
    // For Assets, Liabilities, and Equity, we sum everything up to the end_date.
    let rows = sqlx::query(
        r#"
        SELECT at.nature, 
               SUM(CASE WHEN at.nature IN ('REVENUE', 'EXPENSE') THEN 
                       CASE WHEN date(je.entry_date) BETWEEN date(?) AND date(?) THEN je.debit ELSE 0 END
                   ELSE 
                       CASE WHEN date(je.entry_date) <= date(?) THEN je.debit ELSE 0 END
                   END) as total_debit,
               SUM(CASE WHEN at.nature IN ('REVENUE', 'EXPENSE') THEN 
                       CASE WHEN date(je.entry_date) BETWEEN date(?) AND date(?) THEN je.credit ELSE 0 END
                   ELSE 
                       CASE WHEN date(je.entry_date) <= date(?) THEN je.credit ELSE 0 END
                   END) as total_credit
        FROM journal_entries je
        JOIN accounts a ON a.id = je.account_id
        JOIN account_types at ON at.id = a.account_type_id
        GROUP BY at.nature
        "#
    )
    .bind(&sd).bind(&ed).bind(&ed)
    .bind(&sd).bind(&ed).bind(&ed)
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;"""

code = code.replace(old_func, new_func)

with open('src-tauri/src/reporting.rs', 'w', encoding='utf-8') as f:
    f.write(code)
