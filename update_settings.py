import re

with open('src/features/settings/SettingsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add states for bank settings
state_pattern = r"const \[companyAddress, setCompanyAddress\] = useState\(''\);"

new_states = """const [companyAddress, setCompanyAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountTitle, setBankAccountTitle] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');"""

code = re.sub(state_pattern, new_states, code)

# Initialize from settings
init_pattern = r"const addressSetting = settings\.find\(s => s\.key === 'company_address'\);\s*if \(addressSetting\) setCompanyAddress\(addressSetting\.value\);"

new_init = """const addressSetting = settings.find(s => s.key === 'company_address');
    if (addressSetting) setCompanyAddress(addressSetting.value);
    
    const bName = settings.find(s => s.key === 'bank_name');
    if (bName) setBankName(bName.value);
    
    const bTitle = settings.find(s => s.key === 'bank_account_title');
    if (bTitle) setBankAccountTitle(bTitle.value);
    
    const bAccNo = settings.find(s => s.key === 'bank_account_number');
    if (bAccNo) setBankAccountNumber(bAccNo.value);"""

code = re.sub(init_pattern, new_init, code)

# Save settings
save_pattern = r"await saveSetting\('company_address', companyAddress\);"

new_save = """await saveSetting('company_address', companyAddress);
      await saveSetting('bank_name', bankName);
      await saveSetting('bank_account_title', bankAccountTitle);
      await saveSetting('bank_account_number', bankAccountNumber);"""

code = re.sub(save_pattern, new_save, code)

# UI for Bank Settings
ui_pattern = r"<div className=\"flex justify-end\">\s*<button onClick=\{handleSaveGeneral\} disabled=\{isSubmitting\}"

new_ui = """<div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-medium text-slate-800 mb-4 flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              Bank Details (For Receipts)
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Bank Name</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. Meezan Bank" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account Title</label>
                <input type="text" value={bankAccountTitle} onChange={e => setBankAccountTitle(e.target.value)} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. M K Enterprises" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account Number</label>
                <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. 0123456789" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button onClick={handleSaveGeneral} disabled={isSubmitting}"""

code = re.sub(ui_pattern, new_ui, code)

with open('src/features/settings/SettingsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
