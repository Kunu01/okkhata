import type { WorkspaceSummary } from './types';
const today = new Date();
const ago = (days: number) => new Date(today.getTime() - days * 86400000).toISOString();
export const sample: WorkspaceSummary = {
  business: { _id: 'sample', name: 'Patel General Store', phone: '+919876543210', address: 'Navrangpura, Ahmedabad', upiId: 'patelstore@upi' },
  customers: 8,
  receivable: 4185000,
  advance: 150000,
  unreadNotifications: 0,
  overdueCustomers: [
    { _id: 'c1', name: 'Rahul Sharma', mobile: '+919876543210', balance: 1245000, createdAt: ago(45), dueDate: ago(4), note: 'Monthly household essentials' } as any,
    { _id: 'c3', name: 'Amit Shah', mobile: '+919876543212', balance: 620000, createdAt: ago(31), dueDate: ago(2) } as any,
    { _id: 'c6', name: 'Anjali Joshi', mobile: '+919876543215', balance: 285000, createdAt: ago(19), dueDate: ago(1) } as any,
  ],
  recentTransactions: [
    { _id: 't1', customerId: 'c1', kind: 'received', amount: 250000, delta: -250000, note: 'UPI payment', date: ago(0), createdAt: ago(0) } as any,
    { _id: 't2', customerId: 'c2', kind: 'given', amount: 180000, delta: 180000, note: 'Groceries & household items', date: ago(0), createdAt: ago(0) } as any,
    { _id: 't3', customerId: 'c4', kind: 'received', amount: 320000, delta: -320000, note: 'Account settled', date: ago(0), createdAt: ago(0) } as any,
    { _id: 't4', customerId: 'c3', kind: 'given', amount: 95000, delta: 95000, note: 'Monthly essentials', date: ago(1), createdAt: ago(1) } as any,
    { _id: 't5', customerId: 'c5', kind: 'received', amount: 150000, delta: -150000, note: 'Cash payment', date: ago(1), createdAt: ago(1) } as any,
    { _id: 't6', customerId: 'c6', kind: 'given', amount: 285000, delta: 285000, note: 'Weekly groceries', date: ago(2), createdAt: ago(2) } as any,
  ]
};
