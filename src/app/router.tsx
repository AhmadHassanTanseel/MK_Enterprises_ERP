import { createHashRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../shared/layout/MainLayout';
import { Dashboard } from '../features/dashboard/Dashboard';
import { AccountsPanel } from '../features/accounts/AccountsPanel';
import { AccountTypesPanel } from '../features/accounts/AccountTypesPanel';
import { ProductsPanel } from '../features/inventory/ProductsPanel';
import { CategoriesPanel } from '../features/inventory/CategoriesPanel';
import { InventoryPanel } from '../features/inventory/InventoryPanel';
import { SaleInvoicePanel } from '../features/sales/SaleInvoicePanel';
import { SaleReturnPanel } from '../features/sales/SaleReturnPanel';
import { SalesHistoryPanel } from '../features/sales/SalesHistoryPanel';
import { PurchaseInvoicePanel } from '../features/purchases/PurchaseInvoicePanel';
import { PurchaseReturnPanel } from '../features/purchases/PurchaseReturnPanel';
import { CashReceivedPanel } from '../features/finance/CashReceivedPanel';
import { CashPaymentPanel } from '../features/finance/CashPaymentPanel';
import { JournalVoucherPanel } from '../features/finance/JournalVoucherPanel';
import { ReportPanel } from '../features/reports/ReportPanel';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { AreasPanel } from '../features/settings/AreasPanel';

export const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      
      { path: 'accounts', element: <AccountsPanel /> },
      { path: 'account-types', element: <AccountTypesPanel /> },
      
      { path: 'products', element: <ProductsPanel /> },
      { path: 'categories', element: <CategoriesPanel /> },
      { path: 'inventory', element: <InventoryPanel /> },
      
      { path: 'sales', element: <SaleInvoicePanel /> },
      { path: 'sale-return', element: <SaleReturnPanel /> },
      { path: 'sales-history', element: <SalesHistoryPanel /> },
      
      { path: 'purchases', element: <PurchaseInvoicePanel /> },
      { path: 'purchase-return', element: <PurchaseReturnPanel /> },
      
      { path: 'cash-receive', element: <CashReceivedPanel /> },
      { path: 'cash-payment', element: <CashPaymentPanel /> },
      { path: 'general-voucher', element: <JournalVoucherPanel /> },
      
      { path: 'reports', element: <ReportPanel /> },
      
      { path: 'settings', element: <SettingsPanel /> },
      { path: 'areas', element: <AreasPanel /> },
    ]
  }
]);
