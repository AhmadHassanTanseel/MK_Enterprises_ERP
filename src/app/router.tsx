import { createHashRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../shared/layout/MainLayout';
import { Dashboard } from '../features/dashboard/Dashboard';
import { AccountsPanel } from '../features/accounts/AccountsPanel';
import { AccountTypesPanel } from '../features/accounts/AccountTypesPanel';
import { OtherAccountsPanel } from '../features/accounts/OtherAccountsPanel';
import { ProductMasterPanel } from '../features/inventory/ProductMasterPanel';
import { InventoryPanel } from '../features/inventory/InventoryPanel';
import { SaleInvoicePanel } from '../features/sales/SaleInvoicePanel';
import { SaleReturnPanel } from '../features/sales/SaleReturnPanel';
import { SalesHistoryPanel } from '../features/sales/SalesHistoryPanel';
import { PurchaseInvoicePanel } from '../features/purchases/PurchaseInvoicePanel';
import { PurchaseReturnPanel } from '../features/purchases/PurchaseReturnPanel';
import { JournalVoucherMergedPanel } from '../features/finance/JournalVoucherMergedPanel';
import { ReportPanel } from '../features/reports/ReportPanel';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { UsersPanel } from '../features/settings/UsersPanel';
import { AreasPanel } from '../features/settings/AreasPanel';

import { PurchaseHistoryPanel } from '../features/purchases/PurchaseHistoryPanel';

export const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      
      { path: 'accounts', element: <AccountsPanel /> },
      { path: 'other-accounts', element: <OtherAccountsPanel /> },
      { path: 'account-types', element: <AccountTypesPanel /> },
      
      { path: 'product', element: <ProductMasterPanel /> },
      { path: 'inventory', element: <InventoryPanel /> },
      
      { path: 'sales', element: <SaleInvoicePanel /> },
      { path: 'sale-return', element: <SaleReturnPanel /> },
      { path: 'sales-history', element: <SalesHistoryPanel /> },
      
      { path: 'purchases', element: <PurchaseInvoicePanel /> },
      { path: 'purchase-return', element: <PurchaseReturnPanel /> },
      { path: 'purchase-history', element: <PurchaseHistoryPanel /> },
      
      { path: 'general-voucher', element: <JournalVoucherMergedPanel /> },
      
      { path: 'reports', element: <ReportPanel /> },
      
      { path: 'settings', element: <SettingsPanel /> },
      { path: 'users', element: <UsersPanel /> },
      { path: 'areas', element: <AreasPanel /> },
    ]
  }
]);
