import re

with open('src-tauri/src/lib.rs', 'r', encoding='utf-8') as f:
    code = f.read()

# Add pub mod attendance;
code = code.replace("pub mod attachments;", "pub mod attachments;\npub mod attendance;")

# Add use attendance::*;
code = code.replace("use adjustments::*;", "use adjustments::*;\nuse attendance::*;")

# Add to generate_handler!
handler = "process_journal_voucher,\n            get_workers,\n            get_attendance,\n            mark_attendance,"
code = code.replace("process_journal_voucher,", handler)

with open('src-tauri/src/lib.rs', 'w', encoding='utf-8') as f:
    f.write(code)
