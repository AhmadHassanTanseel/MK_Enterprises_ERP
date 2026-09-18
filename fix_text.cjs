const fs = require('fs');

const path = 'src/shared/layout/MainLayout.tsx';
let code = fs.readFileSync(path, 'utf8');

// The corrupted text from Python's bad utf8 handling
code = code.replace(/<span className="font-bold text-slate-800 text-lg leading-tight">.*?<\/span>/g, '<span className="font-bold text-slate-800 text-lg leading-tight">میاں خان ٹریڈرز</span>');
code = code.replace(/<span className="text-xs text-slate-500 font-medium" dir="rtl">\s*.*?\s*<\/span>/g, '<span className="text-xs text-slate-500 font-medium" dir="rtl">نزد نیشنل بینک جھنگ چنیوٹ روڈ بھوانہ</span>');

// Sidebar text might also be corrupted!
// Original sidebar text was: <h1 className="text-lg font-black tracking-wider text-white">MK ENTERPRISES</h1>
code = code.replace(/<h1 className="text-lg font-black tracking-wider text-white">.*?<\/h1>/g, '<h1 className="text-lg font-black tracking-wider text-white" dir="rtl">میاں خان ٹریڈرز</h1>');

fs.writeFileSync(path, code, 'utf8');

// Fix tauri.conf.json
const tauriPath = 'src-tauri/tauri.conf.json';
let tauriCode = fs.readFileSync(tauriPath, 'utf8');
tauriCode = tauriCode.replace(/"title": "M K Enterprises Business Management System"/g, '"title": "میاں خان ٹریڈرز Business Management System"');
tauriCode = tauriCode.replace(/"productName": "M K Enterprises Business Management System By Tanseel"/g, '"productName": "Mian Khan Traders Business Management System By Tanseel"');
fs.writeFileSync(tauriPath, tauriCode, 'utf8');

console.log("Replaced successfully via Node.");
