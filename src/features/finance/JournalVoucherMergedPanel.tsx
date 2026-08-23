import React from 'react';
import { JournalVoucherPanel as EntryPanel } from './JournalVoucherPanel';
import { JournalVoucherRegisterPanel as RegisterPanel } from './JournalVoucherRegisterPanel';

export const JournalVoucherMergedPanel: React.FC = () => {
  return (
    <div className="flex flex-col xl:flex-row h-full gap-6">
      {/* Entry Form (Left / Top) */}
      <div className="w-full xl:w-1/2 flex flex-col min-h-[500px]">
        <EntryPanel />
      </div>
      
      {/* Register (Right / Bottom) */}
      <div className="w-full xl:w-1/2 flex flex-col min-h-[500px]">
        <RegisterPanel />
      </div>
    </div>
  );
};
