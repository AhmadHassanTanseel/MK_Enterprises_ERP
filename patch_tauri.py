import json

with open('src-tauri/tauri.conf.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

config['bundle'] = {
    "active": True,
    "targets": ["nsis", "msi"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "publisher": "Ahmad Hassan Tanseel"
}

with open('src-tauri/tauri.conf.json', 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
