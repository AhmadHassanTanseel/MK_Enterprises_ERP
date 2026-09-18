import re

with open('src-tauri/src/reporting.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix ReportFilters serialization
old_struct = """#[derive(Debug, Deserialize)]
pub struct ReportFilters {"""

new_struct = """#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportFilters {"""

code = code.replace(old_struct, new_struct)

with open('src-tauri/src/reporting.rs', 'w', encoding='utf-8') as f:
    f.write(code)
