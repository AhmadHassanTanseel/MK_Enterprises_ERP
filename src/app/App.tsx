import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { router } from './router';
import { Toaster } from 'react-hot-toast';
import { LicenseGuard } from './LicenseGuard';
import '../index.css';

export default function App() {
  return (
    <LicenseGuard>
      <AppProvider>
        <Toaster position="top-right" />
        <RouterProvider router={router} />
      </AppProvider>
    </LicenseGuard>
  );
}
