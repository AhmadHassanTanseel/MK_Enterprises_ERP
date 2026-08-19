pub mod database;
pub mod master_data;
pub mod system_accounts;
pub mod audit;
pub mod drm;
pub mod backup;
pub mod users;
pub mod reporting;
pub mod treasury;
pub mod procurement;
pub mod sales;

use master_data::*;
use reporting::*;
use procurement::*;
use sales::*;
use treasury::*;
use drm::*;
use backup::*;
use audit::*;
use tauri::Manager;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Core transaction and master-data commands
            process_sale,
            process_sale_return,
            process_purchase,
            process_return,
            process_cash_transaction,
            process_journal_voucher,
            get_cash_transaction_history,
            save_attachment,
            get_journal_vouchers,

            // Master data
            get_categories,
            create_category,
            update_category,
            delete_category,
            get_areas,
            create_area,
            update_area,
            delete_area,
            get_products,
            create_product,
            update_product,
            delete_product,
            get_accounts,
            create_account,
            update_account,
            delete_account,
            get_account_types,
            create_account_type,

            // Reporting & inventory
            get_account_ledger,
            get_product_ledger,
            get_live_stock,
            get_trial_balance,
            get_sales_history,
            generate_report,
            process_stock_adjustment,
            get_invoices,
            get_all_ledger_entries,

            // Admin & utilities
            // Backup
            get_hardware_id,
            perform_backup,
            restore_database,
            create_system_backup,
            execute_factory_reset,
            get_audit_logs,
            get_settings,
            save_setting
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                match database::initialize_database(&handle).await {
                    Ok(pool) => {
                        handle.manage(pool);
                        println!("Database successfully initialized with full enterprise schema!");
                    }
                    Err(e) => eprintln!("Database initialization failed: {}", e),
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}