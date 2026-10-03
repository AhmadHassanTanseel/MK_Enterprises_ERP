use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use md5;
use tauri::Manager;

#[derive(Serialize)]
pub struct HardwareInfo {
    pub hardware_id: String,
    pub is_activated: bool,
}

const LICENSE_SALT: &str = "MK_ENTERPRISES_SECURE_SALT_2026_TANSEEL";

fn get_hw_id() -> String {
    machine_uid::get().unwrap_or_else(|_| "UNKNOWN_HARDWARE".to_string())
}

fn generate_expected_key(hwid: &str) -> String {
    let raw = format!("{}-{}", hwid, LICENSE_SALT);
    let digest = md5::compute(raw);
    format!("{:x}", digest).to_uppercase()
}

fn get_license_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let mut path = app_handle.path().app_data_dir().unwrap_or_else(|_| std::env::current_dir().unwrap());
    path.push("license.key");
    path
}

#[tauri::command]
pub fn get_hardware_id(app_handle: tauri::AppHandle) -> HardwareInfo {
    let hwid = get_hw_id();
    let expected = generate_expected_key(&hwid);
    let mut is_activated = false;
    
    let path = get_license_path(&app_handle);
    if let Ok(contents) = fs::read_to_string(path) {
        if contents.trim().to_uppercase() == expected {
            is_activated = true;
        }
    }
    
    HardwareInfo {
        hardware_id: hwid,
        is_activated,
    }
}

#[tauri::command]
pub fn verify_license(key: String, app_handle: tauri::AppHandle) -> Result<bool, String> {
    let hwid = get_hw_id();
    let expected = generate_expected_key(&hwid);
    
    if key.trim().to_uppercase() == expected {
        let path = get_license_path(&app_handle);
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        fs::write(path, expected).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}