import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Core Master Data
export interface Product { id: number; code: string; name: string; packing: string | null; purchase_price: number; sale_price: number; opening_stock: number; category_id: number | null; real_barcode: string | null; uom: string | null; reorder_level: number | null; sale_account_id: number | null; }
export interface Account { id: number; name: string; account_type_id: number; contact: string | null; opening_balance: number; current_balance: number; }
export interface Category { id: number; name: string; description: string | null; parent_id: number | null; }
export interface Area { id: number; name: string; salesman_id: number | null; remarks: string | null; }
export interface AccountType { id: number; name: string; nature: 'DR' | 'CR'; trial_bal_type: 'BS' | 'IS'; trial_order: number; }

// Transaction Data
export interface InvoiceLine { product_id: number; qty: number; rate: number; discount_pct: number; amount: number; }
export interface Invoice { id: number; type: 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN'; ref_no: string; account_id: number; date: string; lines: InvoiceLine[]; gross_amount: number; discount_amount: number; net_amount: number; amount_paid: number; }
export interface LedgerEntry { id: number; date: string; account_id: number; dr_amount: number; cr_amount: number; description: string; ref_id?: number; ref_type?: string; }
export interface InventoryMovement { id: number; date: string; product_id: number; qty_in: number; qty_out: number; type: string; ref_id?: number; }
export interface AppSetting { key: string; value: string; }

interface AppContextType {
  products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  accounts: Account[]; setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  categories: Category[]; setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  areas: Area[]; setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  accountTypes: AccountType[]; setAccountTypes: React.Dispatch<React.SetStateAction<AccountType[]>>;
  
  invoices: Invoice[]; setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  ledgerEntries: LedgerEntry[]; setLedgerEntries: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
  inventoryMovements: InventoryMovement[]; setInventoryMovements: React.Dispatch<React.SetStateAction<InventoryMovement[]>>;
  settings: AppSetting[]; setSettings: React.Dispatch<React.SetStateAction<AppSetting[]>>;

  postInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
  postJournalEntry: (date: string, lines: { accountId: number; entryType: 'DR' | 'CR'; amount: number; description?: string }[], description: string) => Promise<void>;
  postPayment: (date: string, accountId: number, type: 'RECEIVE' | 'PAY', amount: number, description: string) => Promise<void>;
  fetchData: () => Promise<void>;

  createCategory: (name: string, description?: string, parent_id?: number, margin_target?: number, flavor?: string) => Promise<void>;
  updateCategory: (id: number, name: string, description?: string, parent_id?: number, margin_target?: number, flavor?: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  createProduct: (code: string, name: string, category_id?: number, packing?: string, purchase_price?: number, sale_price?: number, opening_stock?: number, real_barcode?: string, uom?: string, reorder_level?: number, sale_account_id?: number) => Promise<void>;
  updateProduct: (id: number, code: string, name: string, category_id?: number, packing?: string, purchase_price?: number, sale_price?: number, opening_stock?: number, real_barcode?: string, uom?: string, reorder_level?: number, sale_account_id?: number) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;

  createAccount: (account_type_id: number, name: string, contact?: string, address?: string, area_id?: number, opening_balance?: number, opening_balance_type?: string) => Promise<void>;
  updateAccount: (id: number, account_type_id: number, name: string, contact?: string, address?: string, area_id?: number, opening_balance?: number, opening_balance_type?: string) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;

  createArea: (name: string, salesman_id?: number, remarks?: string) => Promise<void>;
  updateArea: (id: number, name: string, salesman_id?: number, remarks?: string) => Promise<void>;
  deleteArea: (id: number) => Promise<void>;

  createAccountType: (name: string, nature: string, trial_bal_type: string, trial_order: number) => Promise<void>;
  
  saveSetting: (key: string, value: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);

  const fetchData = async () => {
    try {
      const dbCategories: Category[] = await invoke('get_categories');
      setCategories(dbCategories);

      const dbProducts: Product[] = await invoke('get_products');
      setProducts(dbProducts);

      const dbLedger: LedgerEntry[] = await invoke('get_all_ledger_entries');
      const formattedLedger = dbLedger.map((l: any) => ({
        ...l, date: l.date.split(' ')[0]
      }));
      setLedgerEntries(formattedLedger);

      const dbAccounts: Account[] = await invoke('get_accounts');
      // Normalize DB account to UI expectations
      const normalizedAccounts = dbAccounts.map(a => {
        const balance = formattedLedger
          .filter(le => le.account_id === a.id)
          .reduce((sum, le) => sum + le.dr_amount - le.cr_amount, 0);
        return {
          ...a,
          current_balance: balance
        };
      });
      setAccounts(normalizedAccounts);

      const dbAreas: Area[] = await invoke('get_areas');
      setAreas(dbAreas);

      const dbAccountTypes: AccountType[] = await invoke('get_account_types');
      setAccountTypes(dbAccountTypes as any);

      // Fetch dynamic data
      const dbInvoices: any[] = await invoke('get_invoices');
      setInvoices(dbInvoices.map(inv => ({
        id: inv.id,
        type: inv.type,
        ref_no: inv.ref_no,
        account_id: inv.account_id,
        date: inv.date.split(' ')[0], // simple date parsing
        lines: [], // We won't load lines in bulk for performance
        gross_amount: inv.gross_amount,
        discount_amount: inv.discount_amount,
        net_amount: inv.net_amount,
        amount_paid: inv.amount_paid
      })));

      const dbSettings: AppSetting[] = await invoke('get_settings');
      setSettings(dbSettings);

    } catch (error) {
      console.error("Failed to load initial data from Tauri backend:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Master Data CRUD ---

  const createCategory = async (name: string, description?: string, parent_id?: number, margin_target?: number, flavor?: string) => {
    try {
      await invoke('create_category', { name, description, parent_id, margin_target, flavor });
      await fetchData();
    } catch (e) {
      console.error(e); throw e;
    }
  };

  const updateCategory = async (id: number, name: string, description?: string, parent_id?: number, margin_target?: number, flavor?: string) => {
    try {
      await invoke('update_category', { id, name, description, parent_id, margin_target, flavor });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const deleteCategory = async (id: number) => {
    try {
      await invoke('delete_category', { id });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const createProduct = async (code: string, name: string, category_id?: number, packing?: string, purchase_price: number = 0, sale_price: number = 0, opening_stock: number = 0, real_barcode?: string, uom?: string, reorder_level?: number, sale_account_id?: number) => {
    try {
      await invoke('create_product', { code, name, categoryId: category_id, packing, purchasePrice: purchase_price, salePrice: sale_price, openingStock: opening_stock, realBarcode: real_barcode, uom, reorderLevel: reorder_level, saleAccountId: sale_account_id });
      await fetchData();
    } catch (e) {
      console.error(e); throw e;
    }
  };

  const updateProduct = async (id: number, code: string, name: string, category_id?: number, packing?: string, purchase_price: number = 0, sale_price: number = 0, opening_stock: number = 0, real_barcode?: string, uom?: string, reorder_level?: number, sale_account_id?: number) => {
    try {
      await invoke('update_product', { id, code, name, categoryId: category_id, packing, purchasePrice: purchase_price, salePrice: sale_price, openingStock: opening_stock, realBarcode: real_barcode, uom, reorderLevel: reorder_level, saleAccountId: sale_account_id });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const deleteProduct = async (id: number) => {
    try {
      await invoke('delete_product', { id });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const createAccount = async (account_type_id: number, name: string, contact?: string, address?: string, area_id?: number, opening_balance: number = 0, opening_balance_type: string = 'DEBIT') => {
    try {
      await invoke('create_account', { accountTypeId: account_type_id, name, contact, address, areaId: area_id, openingBalance: opening_balance, openingBalanceType: opening_balance_type });
      await fetchData();
    } catch (e) {
      console.error(e); throw e;
    }
  };

  const updateAccount = async (id: number, account_type_id: number, name: string, contact?: string, address?: string, area_id?: number, opening_balance: number = 0, opening_balance_type: string = 'DEBIT') => {
    try {
      await invoke('update_account', { id, accountTypeId: account_type_id, name, contact, address, areaId: area_id, openingBalance: opening_balance, openingBalanceType: opening_balance_type });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const deleteAccount = async (id: number) => {
    try {
      await invoke('delete_account', { id });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const createArea = async (name: string, salesman_id?: number, remarks?: string) => {
    try {
      await invoke('create_area', { name, salesmanId: salesman_id, remarks });
      await fetchData();
    } catch (e) {
      console.error(e); throw e;
    }
  };

  const updateArea = async (id: number, name: string, salesman_id?: number, remarks?: string) => {
    try {
      await invoke('update_area', { id, name, salesmanId: salesman_id, remarks });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const deleteArea = async (id: number) => {
    try {
      await invoke('delete_area', { id });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  const createAccountType = async (name: string, nature: string, trial_bal_type: string, trial_order: number) => {
    try {
      await invoke('create_account_type', { name, nature, trialBalType: trial_bal_type, trialOrder: trial_order });
      await fetchData();
    } catch (e) {
      console.error(e); throw e;
    }
  };
  
  const saveSetting = async (key: string, value: string) => {
    try {
      await invoke('save_setting', { key, value });
      await fetchData();
    } catch (e) { console.error(e); throw e; }
  };

  // --- Workflows ---

  const postJournalEntry = async (date: string, lines: { accountId: number; entryType: 'DR' | 'CR'; amount: number; description?: string }[], description: string) => {
    try {
      await invoke('process_journal_voucher', {
        transDate: date,
        refNo: null,
        lines: lines.map(l => ({
          account_id: l.accountId,
          entry_type: l.entryType,
          amount: l.amount,
          description: l.description || description
        }))
      });
      await fetchData(); // Refresh state
    } catch (error) {
      console.error("Failed to post journal entry:", error);
      throw error;
    }
  };

  const postPayment = async (date: string, accountId: number, type: 'RECEIVE' | 'PAY', amount: number, description: string) => {
    try {
      await invoke('process_cash_transaction', {
        transType: type === 'RECEIVE' ? 'RECEIVE' : 'PAYMENT',
        accountId,
        amount,
        transDate: date,
        description: description,
        paymentMethod: null,
        refNo: null
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to post payment:", error);
      throw error;
    }
  };

  const postInvoice = async (invoiceData: Omit<Invoice, 'id'>) => {
    try {
      if (invoiceData.type === 'SALE') {
        await invoke('process_sale', {
          accountId: invoiceData.account_id,
          invoiceDate: invoiceData.date,
          salesmanId: null,
          invoiceNumber: invoiceData.ref_no,
          lines: invoiceData.lines.map(l => ({
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: l.rate,
            discount_percent: l.discount_pct
          })),
          grossAmount: invoiceData.gross_amount,
          discountAmount: invoiceData.discount_amount,
          netAmount: invoiceData.net_amount,
          amountReceived: invoiceData.amount_paid
        });
      } else if (invoiceData.type === 'PURCHASE') {
        await invoke('process_purchase', {
          supplierId: invoiceData.account_id,
          invoiceDate: invoiceData.date,
          salesmanId: null,
          invoiceNumber: invoiceData.ref_no,
          lines: invoiceData.lines.map(l => ({
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: l.rate,
            discount_percent: l.discount_pct
          })),
          grossAmount: invoiceData.gross_amount,
          discountAmount: invoiceData.discount_amount,
          netAmount: invoiceData.net_amount,
          amountPaid: invoiceData.amount_paid
        });
      } else if (invoiceData.type === 'SALE_RETURN') {
        await invoke('process_sale_return', {
          accountId: invoiceData.account_id,
          invoiceDate: invoiceData.date,
          invoiceNumber: invoiceData.ref_no || null,
          lines: invoiceData.lines.map(l => ({
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: l.rate,
            discount_percent: l.discount_pct
          })),
          grossAmount: invoiceData.gross_amount,
          discountAmount: invoiceData.discount_amount,
          netAmount: invoiceData.net_amount
        });
      } else if (invoiceData.type === 'PURCHASE_RETURN') {
        await invoke('process_return', {
          supplierId: invoiceData.account_id,
          invoiceDate: invoiceData.date,
          invoiceNumber: invoiceData.ref_no || null,
          lines: invoiceData.lines.map(l => ({
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: l.rate,
            discount_percent: l.discount_pct
          })),
          grossAmount: invoiceData.gross_amount,
          discountAmount: invoiceData.discount_amount,
          netAmount: invoiceData.net_amount,
          returnType: 'R'
        });
      }
      
      await fetchData(); // Refresh state from DB
    } catch (error) {
      console.error("Failed to post invoice:", error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      products, setProducts,
      accounts, setAccounts,
      categories, setCategories,
      areas, setAreas,
      accountTypes, setAccountTypes,
      invoices, setInvoices,
      ledgerEntries, setLedgerEntries,
      inventoryMovements, setInventoryMovements,
      settings, setSettings,
      postInvoice,
      postJournalEntry,
      postPayment,
      fetchData,
      createCategory, updateCategory, deleteCategory,
      createProduct, updateProduct, deleteProduct,
      createAccount, updateAccount, deleteAccount,
      createArea, updateArea, deleteArea,
      createAccountType,
      saveSetting
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
