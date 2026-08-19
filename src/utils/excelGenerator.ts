import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { LedgerEntry, Account } from '../app/context/AppContext';

export const generateReportExcel = (
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

export const generateGenericReportExcel = (
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
