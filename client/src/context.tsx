import { createContext, useContext, type ReactNode } from 'react';
import type { User, Workspace } from './types';
import type { Field } from './components';
export type DialogConfig = { title: string; subtitle?: string; layout?: 'entry' | 'customer'; fields: Field[]; submitLabel?: string; onSubmit: (data: Record<string, string>) => Promise<void>; children?: ReactNode };
export type AppContextType = { data: Workspace; user?: User; demo: boolean; refresh: () => Promise<void>; toast: (message: string) => void; open: (dialog: DialogConfig) => void; requireAccount: () => boolean; addCustomer: () => void; addEntry: (kind: 'given' | 'received', customerId?: string, action?: 'udhar' | 'advance' | 'payment') => void; remind: (customerId: string) => void; search: string };
export const AppContext = createContext<AppContextType>(null!);
export const useApp = () => useContext(AppContext);
