// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Run the Tauri core application defined in lib.rs
    app_lib::run();
}