import re

with open('src-tauri/src/sales.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Update signature
old_sig = """pub async fn settle_dispatch(
    dispatch_id: i64,
    lines: Vec<SettleLine>,
    amount_received: Option<f64>,
    db: State<'_, SqlitePool>,
)"""
new_sig = """pub async fn settle_dispatch(
    dispatch_id: i64,
    lines: Vec<SettleLine>,
    amount_received_cash: Option<f64>,
    amount_received_bank: Option<f64>,
    db: State<'_, SqlitePool>,
)"""
code = code.replace(old_sig, new_sig)

# Find the accounting part and replace it
# The accounting part looks like:
#        let actual_received = amount_received.unwrap_or(net);
#        let bakaya = net - actual_received;

old_accounting = """        let actual_received = amount_received.unwrap_or(net);
        let bakaya = net - actual_received;"""
new_accounting = """        let cash_val = amount_received_cash.unwrap_or_else(|| { if amount_received_bank.is_some() { 0.0 } else { net } });
        let bank_val = amount_received_bank.unwrap_or(0.0);
        let actual_received = cash_val + bank_val;
        let bakaya = net - actual_received;"""
code = code.replace(old_accounting, new_accounting)

# Then the journal entries part at the bottom
#        let cash_acc_id = 1; // Default Cash account
#        let sales_acc_id = 3; // Default Sales account
#        
#        // Debit Cash
#        sqlx::query("INSERT INTO journal_entries ...
#            .bind(cash_acc_id).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
#            
#        // Credit Sales
#        sqlx::query("INSERT INTO journal_entries ...
#            .bind(sales_acc_id).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;

old_journal = """        let cash_acc_id = 1; // Default Cash account
        let sales_acc_id = 3; // Default Sales account
        
        // Debit Cash
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0, 'SALE', ?, 'Dispatch Sale Cash')")
            .bind(cash_acc_id).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            
        // Credit Sales
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0, ?, 'SALE', ?, 'Dispatch Sale Revenue')")
            .bind(sales_acc_id).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;"""

new_journal = """        let accounts = crate::system_accounts::get_system_accounts(&db).await?;
        
        // Debit AR (target_account) and Credit Sales Revenue
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'INVOICE', ?, 'Sale Invoice')")
            .bind(target_account).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            
        sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'INVOICE', ?, 'Sale Revenue')")
            .bind(accounts.sales_revenue).bind(net).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;

        // Handle Cash Received
        if cash_val > 0.0 {
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'CASH_RECEIPT', ?, 'Cash Received at Settlement')")
                .bind(accounts.cash).bind(cash_val).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'CASH_RECEIPT', ?, 'Cash Received at Settlement')")
                .bind(target_account).bind(cash_val).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }

        // Handle Bank Received
        if bank_val > 0.0 {
            let bank_account_id = 99; // Fixed Bank Account ID
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, ?, 0.0, 'BANK_RECEIPT', ?, 'Bank Received at Settlement')")
                .bind(bank_account_id).bind(bank_val).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            
            sqlx::query("INSERT INTO journal_entries (account_id, debit, credit, voucher_type, reference_id, narration) VALUES (?, 0.0, ?, 'BANK_RECEIPT', ?, 'Bank Received at Settlement')")
                .bind(target_account).bind(bank_val).bind(invoice_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }"""
code = code.replace(old_journal, new_journal)

with open('src-tauri/src/sales.rs', 'w', encoding='utf-8') as f:
    f.write(code)
