import re

with open('src-tauri/src/lib.rs', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "get_hardware_id,",
    "get_hardware_id,\n            verify_license,"
)

# And add the import: `use drm::{get_hardware_id, verify_license};` if it's imported like that.
code = code.replace(
    "use drm::get_hardware_id;",
    "use drm::{get_hardware_id, verify_license};"
)
code = code.replace(
    "pub mod drm;",
    "pub mod drm;"
)

with open('src-tauri/src/lib.rs', 'w', encoding='utf-8') as f:
    f.write(code)
