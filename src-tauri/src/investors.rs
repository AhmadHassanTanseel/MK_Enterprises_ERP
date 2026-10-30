use serde::{Deserialize, Serialize};
use tauri::State;
use sqlx::{SqlitePool, Row};

#[derive(Debug, Serialize, Deserialize)]
pub struct InvestorSummary {
    pub id: i64,
    pub name: String,
    pub contact: Option<String>,
    pub address: Option<String>,
    pub agreement_terms: Option<String>,
    pub total_investment: f64,
    pub total_profit_paid: f64,
    pub current_capital: f64,
    pub last_payout_date: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvestorTransactionRecord {
    pub id: i64,
    pub investor_account_id: i64,
    pub trans_type: String, // 'INVESTMENT', 'PROFIT_PAYOUT', 'CAPITAL_WITHDRAWAL'
    pub amount: f64,
    pub trans_date: String,
    pub payment_method: String,
    pub bank_account_id: Option<i64>,
    pub bank_name: Option<String>,
    pub month_period: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub async fn get_investors(pool: State<'_, SqlitePool>) -> Result<Vec<InvestorSummary>, String> {
    let records = sqlx::query(
        r#"
        SELECT 
            a.id,
            a.name,
            a.contact,
            a.address,
            a.designation as agreement_terms,
            COALESCE(inv.total_invest, 0.0) as total_investment,
            COALESCE(prof.total_profit, 0.0) as total_profit_paid,
            (COALESCE(inv.total_invest, 0.0) - COALESCE(withd.total_withdraw, 0.0)) as current_capital,
            prof.last_payout,
            COALESCE(a.created_at, '') as created_at
        FROM accounts a
        LEFT JOIN (
            SELECT investor_account_id, SUM(amount) as total_invest 
            FROM investor_transactions 
            WHERE trans_type = 'INVESTMENT' 
            GROUP BY investor_account_id
        ) inv ON inv.investor_account_id = a.id
        LEFT JOIN (
            SELECT investor_account_id, SUM(amount) as total_profit, MAX(trans_date) as last_payout 
            FROM investor_transactions 
            WHERE trans_type = 'PROFIT_PAYOUT' 
            GROUP BY investor_account_id
        ) prof ON prof.investor_account_id = a.id
        LEFT JOIN (
            SELECT investor_account_id, SUM(amount) as total_withdraw 
            FROM investor_transactions 
            WHERE trans_type = 'CAPITAL_WITHDRAWAL' 
            GROUP BY investor_account_id
        ) withd ON withd.investor_account_id = a.id
        WHERE a.account_type_id = 16
        ORDER BY a.id DESC;
        "#
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in records {
        list.push(InvestorSummary {
            id: r.try_get("id").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            contact: r.try_get("contact").unwrap_or(None),
            address: r.try_get("address").unwrap_or(None),
            agreement_terms: r.try_get("agreement_terms").unwrap_or(None),
            total_investment: r.try_get("total_investment").unwrap_or(0.0),
            total_profit_paid: r.try_get("total_profit_paid").unwrap_or(0.0),
            current_capital: r.try_get("current_capital").unwrap_or(0.0),
            last_payout_date: r.try_get("last_payout").unwrap_or(None),
            created_at: r.try_get("created_at").unwrap_or_default(),
        });
    }
    Ok(list)
}

#[tauri::command]
pub async fn add_investor(
    pool: State<'_, SqlitePool>,
    name: String,
    contact: Option<String>,
    address: Option<String>,
    agreement_terms: Option<String>,
    initial_capital: f64,
    trans_date: String,
    payment_method: String,
    bank_account_id: Option<i64>,
) -> Result<i64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Ensure account type 16 exists
    sqlx::query(
        "INSERT OR IGNORE INTO account_types (id, name, nature, trial_bal_type, trial_order) VALUES (16, 'Investor Capital', 'EQUITY', 'CREDIT', 16)"
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // 2. Insert into accounts
    let res = sqlx::query(
        "INSERT INTO accounts (account_type_id, name, contact, address, designation, is_customer, is_supplier) VALUES (16, ?, ?, ?, ?, 0, 0)"
    )
    .bind(name.trim())
    .bind(&contact)
    .bind(&address)
    .bind(&agreement_terms)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let investor_id = res.last_insert_rowid();

    // 3. If initial capital > 0, record transaction & journal entry
    if initial_capital > 0.0 {
        let is_bank = payment_method.to_uppercase() == "BANK";
        let treasury_account_id = if is_bank {
            bank_account_id.unwrap_or(6)
        } else {
            1
        };

        sqlx::query(
            r#"
            INSERT INTO investor_transactions (
                investor_account_id, trans_type, amount, trans_date, payment_method, bank_account_id, notes
            ) VALUES (?, 'INVESTMENT', ?, ?, ?, ?, 'Initial Capital Investment')
            "#
        )
        .bind(investor_id)
        .bind(initial_capital)
        .bind(&trans_date)
        .bind(&payment_method)
        .bind(if is_bank { bank_account_id } else { None })
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let voucher_type = if is_bank { "BANK_RECEIPT" } else { "CASH_RECEIPT" };
        let narration = format!("Initial Capital Investment from {}", name.trim());

        // Debit Treasury (Cash or Bank increases)
        sqlx::query(
            "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, ?, 0.0, ?, ?, ?)"
        )
        .bind(treasury_account_id)
        .bind(initial_capital)
        .bind(voucher_type)
        .bind(&narration)
        .bind(&trans_date)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Credit Investor Capital Account (Equity/Capital increases)
        sqlx::query(
            "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, 0.0, ?, ?, ?, ?)"
        )
        .bind(investor_id)
        .bind(initial_capital)
        .bind(voucher_type)
        .bind(&narration)
        .bind(&trans_date)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(investor_id)
}

#[tauri::command]
pub async fn add_investor_capital(
    pool: State<'_, SqlitePool>,
    investor_id: i64,
    amount: f64,
    trans_date: String,
    payment_method: String,
    bank_account_id: Option<i64>,
    notes: Option<String>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let row = sqlx::query("SELECT name FROM accounts WHERE id = ?")
        .bind(investor_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let investor_name: String = row.try_get("name").unwrap_or_default();

    let is_bank = payment_method.to_uppercase() == "BANK";
    let treasury_account_id = if is_bank {
        bank_account_id.unwrap_or(6)
    } else {
        1
    };

    let user_notes = notes.unwrap_or_default();
    let note_text = if !user_notes.trim().is_empty() {
        format!("Additional Capital: {}", user_notes.trim())
    } else {
        "Additional Capital Investment".to_string()
    };

    sqlx::query(
        r#"
        INSERT INTO investor_transactions (
            investor_account_id, trans_type, amount, trans_date, payment_method, bank_account_id, notes
        ) VALUES (?, 'INVESTMENT', ?, ?, ?, ?, ?)
        "#
    )
    .bind(investor_id)
    .bind(amount)
    .bind(&trans_date)
    .bind(&payment_method)
    .bind(if is_bank { bank_account_id } else { None })
    .bind(&note_text)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let voucher_type = if is_bank { "BANK_RECEIPT" } else { "CASH_RECEIPT" };
    let narration = format!("Additional Capital Deposit - {} ({})", investor_name, note_text);

    // Debit Treasury
    sqlx::query(
        "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, ?, 0.0, ?, ?, ?)"
    )
    .bind(treasury_account_id)
    .bind(amount)
    .bind(voucher_type)
    .bind(&narration)
    .bind(&trans_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Credit Investor Capital
    sqlx::query(
        "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, 0.0, ?, ?, ?, ?)"
    )
    .bind(investor_id)
    .bind(amount)
    .bind(voucher_type)
    .bind(&narration)
    .bind(&trans_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn pay_investor_profit(
    pool: State<'_, SqlitePool>,
    investor_id: i64,
    amount: f64,
    trans_date: String,
    month_period: Option<String>,
    payment_method: String,
    bank_account_id: Option<i64>,
    notes: Option<String>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let row = sqlx::query("SELECT name FROM accounts WHERE id = ?")
        .bind(investor_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let investor_name: String = row.try_get("name").unwrap_or_default();

    // Ensure Profit Distribution account exists
    let profit_acc = sqlx::query("SELECT id FROM accounts WHERE name = 'Investor Profit Distribution'")
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let profit_acc_id: i64 = if let Some(a) = profit_acc {
        a.try_get("id").unwrap_or(8)
    } else {
        let r = sqlx::query(
            "INSERT INTO accounts (account_type_id, name, is_customer, is_supplier) VALUES (7, 'Investor Profit Distribution', 0, 0)"
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        r.last_insert_rowid()
    };

    let is_bank = payment_method.to_uppercase() == "BANK";
    let treasury_account_id = if is_bank {
        bank_account_id.unwrap_or(6)
    } else {
        1
    };

    let period = month_period.unwrap_or_default();
    let user_notes = notes.unwrap_or_default();

    sqlx::query(
        r#"
        INSERT INTO investor_transactions (
            investor_account_id, trans_type, amount, trans_date, payment_method, bank_account_id, month_period, notes
        ) VALUES (?, 'PROFIT_PAYOUT', ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(investor_id)
    .bind(amount)
    .bind(&trans_date)
    .bind(&payment_method)
    .bind(if is_bank { bank_account_id } else { None })
    .bind(&period)
    .bind(&user_notes)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let voucher_type = if is_bank { "BANK_PAYMENT" } else { "CASH_PAYMENT" };
    let narration = format!(
        "Monthly Profit Payout to {} for {} - {}",
        investor_name, period, user_notes
    );

    // Debit Profit Distribution (Expense increases)
    sqlx::query(
        "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, ?, 0.0, ?, ?, ?)"
    )
    .bind(profit_acc_id)
    .bind(amount)
    .bind(voucher_type)
    .bind(&narration)
    .bind(&trans_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Credit Treasury (Cash or Bank decreases)
    sqlx::query(
        "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, 0.0, ?, ?, ?, ?)"
    )
    .bind(treasury_account_id)
    .bind(amount)
    .bind(voucher_type)
    .bind(&narration)
    .bind(&trans_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn withdraw_investor_capital(
    pool: State<'_, SqlitePool>,
    investor_id: i64,
    amount: f64,
    trans_date: String,
    payment_method: String,
    bank_account_id: Option<i64>,
    notes: Option<String>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let row = sqlx::query("SELECT name FROM accounts WHERE id = ?")
        .bind(investor_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let investor_name: String = row.try_get("name").unwrap_or_default();

    let is_bank = payment_method.to_uppercase() == "BANK";
    let treasury_account_id = if is_bank {
        bank_account_id.unwrap_or(6)
    } else {
        1
    };

    let user_notes = notes.unwrap_or_default();
    let note_text = if !user_notes.trim().is_empty() {
        format!("Capital Return: {}", user_notes.trim())
    } else {
        "Capital Return / Withdrawal".to_string()
    };

    sqlx::query(
        r#"
        INSERT INTO investor_transactions (
            investor_account_id, trans_type, amount, trans_date, payment_method, bank_account_id, notes
        ) VALUES (?, 'CAPITAL_WITHDRAWAL', ?, ?, ?, ?, ?)
        "#
    )
    .bind(investor_id)
    .bind(amount)
    .bind(&trans_date)
    .bind(&payment_method)
    .bind(if is_bank { bank_account_id } else { None })
    .bind(&note_text)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let voucher_type = if is_bank { "BANK_PAYMENT" } else { "CASH_PAYMENT" };
    let narration = format!("Capital Return to {} - {}", investor_name, note_text);

    // Debit Investor Account (Reduces Equity/Capital)
    sqlx::query(
        "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, ?, 0.0, ?, ?, ?)"
    )
    .bind(investor_id)
    .bind(amount)
    .bind(voucher_type)
    .bind(&narration)
    .bind(&trans_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Credit Treasury (Cash or Bank decreases)
    sqlx::query(
        "INSERT INTO journal_entries (account_id, debit, credit, voucher_type, narration, entry_date) VALUES (?, 0.0, ?, ?, ?, ?)"
    )
    .bind(treasury_account_id)
    .bind(amount)
    .bind(voucher_type)
    .bind(&narration)
    .bind(&trans_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_investor_statement(
    pool: State<'_, SqlitePool>,
    investor_id: i64,
) -> Result<Vec<InvestorTransactionRecord>, String> {
    let records = sqlx::query(
        r#"
        SELECT 
            t.id,
            t.investor_account_id,
            t.trans_type,
            t.amount,
            t.trans_date,
            t.payment_method,
            t.bank_account_id,
            b.name as bank_name,
            t.month_period,
            t.notes,
            COALESCE(t.created_at, '') as created_at
        FROM investor_transactions t
        LEFT JOIN accounts b ON b.id = t.bank_account_id
        WHERE t.investor_account_id = ?
        ORDER BY t.trans_date ASC, t.id ASC
        "#
    )
    .bind(investor_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in records {
        list.push(InvestorTransactionRecord {
            id: r.try_get("id").unwrap_or(0),
            investor_account_id: r.try_get("investor_account_id").unwrap_or(0),
            trans_type: r.try_get("trans_type").unwrap_or_default(),
            amount: r.try_get("amount").unwrap_or(0.0),
            trans_date: r.try_get("trans_date").unwrap_or_default(),
            payment_method: r.try_get("payment_method").unwrap_or_default(),
            bank_account_id: r.try_get("bank_account_id").unwrap_or(None),
            bank_name: r.try_get("bank_name").unwrap_or(None),
            month_period: r.try_get("month_period").unwrap_or(None),
            notes: r.try_get("notes").unwrap_or(None),
            created_at: r.try_get("created_at").unwrap_or_default(),
        });
    }
    Ok(list)
}
