import type { Workspace } from './types';
const today = new Date();
const ago = (days: number) => new Date(today.getTime() - days * 86400000).toISOString();
export const sample: Workspace = {
  business: { _id: 'sample', name: 'Patel General Store', phone: '+919876543210', address: 'Navrangpura, Ahmedabad', upiId: 'patelstore@upi' },
  customers: [
    { _id: 'c1', name: 'Rahul Sharma', mobile: '+919876543210', balance: 1245000, createdAt: ago(45), dueDate: ago(4), note: 'Monthly household essentials' },
    { _id: 'c2', name: 'Priya Patel', mobile: '+919876543211', balance: 850000, createdAt: ago(38), dueDate: ago(-3) },
    { _id: 'c3', name: 'Amit Shah', mobile: '+919876543212', balance: 620000, createdAt: ago(31), dueDate: ago(2) },
    { _id: 'c4', name: 'Neha Desai', mobile: '+919876543213', balance: 0, createdAt: ago(26) },
    { _id: 'c5', name: 'Vikram Mehta', mobile: '+919876543214', balance: 450000, createdAt: ago(22), dueDate: ago(-5) },
    { _id: 'c6', name: 'Anjali Joshi', mobile: '+919876543215', balance: 285000, createdAt: ago(19), dueDate: ago(1) },
    { _id: 'c7', name: 'Suresh Kumar', mobile: '+919876543216', balance: -150000, createdAt: ago(15) },
    { _id: 'c8', name: 'Kavita Rao', mobile: '+919876543217', balance: 175000, createdAt: ago(10) },
  ],
  entries: [
    { _id: 't1', customerId: 'c1', kind: 'received', amount: 250000, delta: -250000, note: 'UPI payment', date: ago(0), createdAt: ago(0) },
    { _id: 't2', customerId: 'c2', kind: 'given', amount: 180000, delta: 180000, note: 'Groceries & household items', date: ago(0), createdAt: ago(0) },
    { _id: 't3', customerId: 'c4', kind: 'received', amount: 320000, delta: -320000, note: 'Account settled', date: ago(0), createdAt: ago(0) },
    { _id: 't4', customerId: 'c3', kind: 'given', amount: 95000, delta: 95000, note: 'Monthly essentials', date: ago(1), createdAt: ago(1) },
    { _id: 't5', customerId: 'c5', kind: 'received', amount: 150000, delta: -150000, note: 'Cash payment', date: ago(1), createdAt: ago(1) },
    { _id: 't6', customerId: 'c6', kind: 'given', amount: 285000, delta: 285000, note: 'Weekly groceries', date: ago(2), createdAt: ago(2) },
  ],
  products: [
    { _id: 'p1', name: 'Aashirvaad Atta · 5 kg', sku: 'GRC-001', price: 28500, cost: 26000, stock: 24, minimum: 10, unit: 'bags' },
    { _id: 'p2', name: 'Fortune Sunflower Oil · 1 L', sku: 'GRC-002', price: 14500, cost: 12800, stock: 8, minimum: 10, unit: 'bottles' },
    { _id: 'p3', name: 'Tata Tea Premium · 500 g', sku: 'GRC-003', price: 26000, cost: 22500, stock: 32, minimum: 8, unit: 'packs' },
    { _id: 'p4', name: 'India Gate Rice · 1 kg', sku: 'GRC-004', price: 16500, cost: 14000, stock: 5, minimum: 8, unit: 'bags' },
  ],
  bills: [{ _id: 'b1', customerId: 'c2', number: 'OK-00012', items: [{ name: 'Groceries & household items', quantity: 1, price: 180000, taxRate: 0 }], subtotal: 180000, tax: 0, total: 180000, createdAt: ago(0) }],
  paymentRequests: [{ _id: 'pr1', customerId: 'c1', amount: 250000, currency: 'INR', upiId: 'patelstore@upi', intent: 'upi://pay?pa=patelstore%40upi&am=2500.00&cu=INR', status: 'paid', note: 'UPI payment', createdAt: ago(0), paidAt: ago(0), entryId: 't1' }],
  notifications: [{ _id: 'n1', title: 'Payment recorded', body: 'Rahul Sharma · ₹2,500', href: '/customers/c1', createdAt: ago(0) }, { _id: 'n2', title: 'Credit recorded', body: 'Priya Patel · ₹1,800', href: '/customers/c2', createdAt: ago(0) }],
  totals: { receivable: 3625000, advance: 150000, customers: 8 },
  monthly: Array.from({ length: 6 }, (_, i) => ({ _id: new Date(Date.UTC(today.getFullYear(), today.getMonth() - 5 + i, 15)).toISOString().slice(0, 7), given: [1800000, 2600000, 2100000, 3600000, 3000000, 4200000][i], received: [1400000, 2000000, 1700000, 2700000, 2600000, 3450000][i] })), recordLimit: 500,
};
