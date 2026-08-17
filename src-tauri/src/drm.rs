use sysinfo::System;
use serde::Serialize;

#[derive(Serialize)]
pub struct HardwareInfo {
    pub hardware_id: String,
}

#[tauri::command]
pub fn get_hardware_id() -> HardwareInfo {
    // Generate a unique ID based on System Information
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Combining OS name and Hostname creates a semi-unique HW ID
    let raw_id = format!("{}-{}-{}", 
        System::name().unwrap_or_default(),
        System::host_name().unwrap_or_default(),
        System::cpu_arch().unwrap_or_default()
    );
    
    // Simple hash to clean it up
    let hardware_id = format!("{:x}", md5::compute(raw_id));
    HardwareInfo { hardware_id }
}