import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';
import React from 'react';
import { LedgerEntry, Account } from '../app/context/AppContext';


async function saveExcel(wb: XLSX.WorkBook, defaultFileName: string, documentName: string) {
  try {
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });

    if (!filePath) {
      return; // User cancelled
    }

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    await writeFile(filePath, new Uint8Array(excelBuffer));
    
    toast((t) => React.createElement('div', { className: 'flex flex-col gap-2' },
      React.createElement('span', null, `${documentName} exported to Excel`),
      React.createElement('span', { className: 'text-xs text-slate-500 break-all' }, filePath),
      React.createElement('div', { className: 'flex gap-2 mt-2' },
        React.createElement('button', {
          onClick: () => { open(filePath); toast.dismiss(t.id); },
          className: 'px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700'
        }, 'Open File'),
        React.createElement('button', {
          onClick: () => toast.dismiss(t.id),
          className: 'px-3 py-1 bg-slate-200 text-slate-800 rounded text-xs hover:bg-slate-300'
        }, 'Dismiss')
      )
    ), { duration: 8000 });
  } catch (err: any) {
    toast.error(`Excel export failed: ${err.message || err.toString()}`);
  }
}

export const generateReportExcel = async (
  reportType: string,
  entries: LedgerEntry[], 
  accounts: Account[], 
  fromDate: string,
  toDate: string
) => {
  // Prepare data for Excel
  const data = entries.map(entry => {
    const account = accounts.find(a => a.id === entry.account_id);
    return {
      'Date': entry.date,
      'Account': account ? account.name : `Account ID: ${entry.account_id}`,
      'Description': entry.description || '',
      'Debit (Rs)': entry.dr_amount,
      'Credit (Rs)': entry.cr_amount
    };
  });

  // Calculate totals
  const totalDebit = entries.reduce((sum, e) => sum + e.dr_amount, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.cr_amount, 0);

  data.push({
    'Date': '',
    'Account': '',
    'Description': 'TOTALS',
    'Debit (Rs)': totalDebit,
    'Credit (Rs)': totalCredit
  });

  // Create a new workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, reportType);

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${reportType}_Report_${fromDate}_to_${toDate}.xlsx`);
  toast.success('Exported to Excel');
};

export const generateGenericReportExcel = async (
  report: any,
  fromDate: string,
  toDate: string
) => {
  const data = report.rows.map((row: any[]) => {
    const obj: any = {};
    report.headers.forEach((h: string, i: number) => {
      obj[h] = row[i];
    });
    return obj;
  });

  const totalsObj: any = {};
  if (report.totals && report.totals.length > 0) {
    report.headers.forEach((h: string, i: number) => {
      totalsObj[h] = i === 0 ? 'TOTALS' : '';
    });
    report.totals.forEach((t: any) => {
      totalsObj[t.label] = t.value;
    });
    data.push(totalsObj);
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, report.title);

  XLSX.writeFile(workbook, `${report.title.replace(/ /g, '_')}_${fromDate}_to_${toDate}.xlsx`);
  toast.success('Exported to Excel');
};
