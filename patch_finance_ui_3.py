import re

with open('src/features/reports/FinancialStatementsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import for PDF
old_imports = """import { invoke } from '@tauri-apps/api/core';
import { DollarSign, TrendingUp, TrendingDown, Building, Wallet, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';"""
new_imports = """import { invoke } from '@tauri-apps/api/core';
import { DollarSign, TrendingUp, TrendingDown, Building, Wallet, CreditCard, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateFinancialStatementPDF } from '../../utils/pdfGenerator';"""
code = code.replace(old_imports, new_imports)

# Add Print Button next to Filter button
old_button = """          <button 
            onClick={loadSummary}
            className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Filter
          </button>
        </div>"""
new_button = """          <button 
            onClick={loadSummary}
            className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Filter
          </button>
          <button 
            onClick={() => summary && generateFinancialStatementPDF(summary, startDate, endDate)}
            className="ml-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-medium flex items-center gap-2"
          >
            <Printer size={16} /> PDF
          </button>
        </div>"""
code = code.replace(old_button, new_button)

with open('src/features/reports/FinancialStatementsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
