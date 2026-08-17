# PROJECT_STATE.md — MK Enterprises ERP

## Project Overview
Desktop ERP application replacing a legacy Microsoft Access system. Built with Tauri v2 (React + Rust + SQLite).

## Architecture
Tauri v2 IPC → React 18 frontend (Vite, TypeScript, TailwindCSS) → Rust backend (sqlx + SQLite WAL)

## Technology Stack
- Frontend: React 18.3.1, TypeScript 5.5.3, Vite 5.3.4, TailwindCSS 3.4, react-router-dom 7.18
- Backend: Rust 2021 edition, Tauri 2.0.0, sqlx 0.8 (SQLite)
- Database: SQLite with WAL journaling, foreign keys enabled
- PDF: jspdf + jspdf-autotable
- Excel: xlsx (SheetJS)

## Current Phase
Phase 1 — Foundation Fixes

## Completed Tasks
- Phase 0: Full forensic audit completed

## Remaining Tasks
- Phase 1: Dead code cleanup, schema consolidation, backend bug fixes
- Phase 2: IPC contract alignment
- Phase 3: Complete missing backend
- Phase 4: UI integration
- Phase 5: Business logic hardening
- Phase 6: Security & auth
- Phase 7: Testing
- Phase 8: Stabilization & production build

## Known Bugs
1. `create_product` does not record OPENING inventory movement
2. `update_account` does not update opening balance journal entry (no transaction)
3. `process_stock_adjustment` omits `movement_type` (NOT NULL violation)
4. `get_product_ledger` hardcodes date to `now()` and description to static string
5. `delete_*` operations have no dependency checking
6. `postInvoice()` frontend IPC does not match backend command signatures
7. Sale Return has no backend implementation
8. Account `current_balance` is faked to `opening_balance`
9. Inventory Panel shows `opening_stock` not real computed stock
10. 6 backend commands are stubs/mocks

## Known Assumptions
- Single-user desktop application (no concurrent access)
- Account type IDs 1-8 are stable seed data
- Cash Drawer = account ID 1 (to be made configurable)

## Last Verified Build
Not yet verified in this session.

## Last Verified Test Run
No tests exist yet.
