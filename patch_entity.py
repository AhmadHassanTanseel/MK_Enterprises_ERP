import re

with open('src/shared/components/EntitySelect.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Change interface
code = code.replace("onChange: (id: number) => void;", "onChange: (id: number | null) => void;")

# Change the onChange logic
old_on_change = """          onChange={(e) => {
            if (e.target.value === 'ADD_NEW') {
              setShowQuickCreate(true);
              // reset select to 0 or previous
            } else {
              onChange(Number(e.target.value));
            }
          }}"""

new_on_change = """          onChange={(e) => {
            if (e.target.value === 'ADD_NEW') {
              setShowQuickCreate(true);
            } else {
              const val = Number(e.target.value);
              onChange(val === 0 ? null : val);
            }
          }}"""

code = code.replace(old_on_change, new_on_change)

with open('src/shared/components/EntitySelect.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
