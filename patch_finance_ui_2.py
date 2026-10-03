import re

with open('src/features/reports/FinancialStatementsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_header = r"""      <div>
        <h1 className="text-3xl font-bold text-slate-800">Financial Statements</h1>
        <p className="text-slate-500 mt-1">Real-time Profit & Loss and Balance Sheet.</p>
      </div>"""
new_header = """      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Financial Statements</h1>
          <p className="text-slate-500 mt-1">Profit & Loss and Balance Sheet.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase">From Date</label>
            <input 
              type="date" 
              className="outline-none border-none bg-transparent font-medium text-slate-700"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-500 uppercase">To Date</label>
            <input 
              type="date" 
              className="outline-none border-none bg-transparent font-medium text-slate-700"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button 
            onClick={loadSummary}
            className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Filter
          </button>
        </div>
      </div>"""
code = code.replace(old_header, new_header)

with open('src/features/reports/FinancialStatementsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
