import { newId } from './id';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Bell, BookOpen, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, CircleHelp, FileText, LayoutDashboard, LogOut, Menu, Package, Plus, Search, Settings, ShieldCheck, Sparkles, Users, X, WifiOff, LockKeyhole } from 'lucide-react';
import { api, ApiError, localDateTime, money, patch, post, toMinor } from './api';
import { EntryAttachment, mediaUrl } from './images';
import { sample } from './sample';
import { Avatar, Calculator, FormDialog } from './components';
import { AppContext, type DialogConfig } from './context';
import AuthPage from './AuthPage';
import { Dashboard, Customers, CustomerDetail, Transactions, Bills, Inventory, Reports, Notifications } from './pages';
import SettingsPage, { palettes } from './SettingsPage';
import { LockScreen } from './lock';
import type { User, Workspace } from './types';
import { LanguageLayer, languageOptions } from './i18n';
const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard }, { to: '/customers', label: 'Customers', icon: Users, feature: 'customers' as const },
  { to: '/transactions', label: 'Transactions', icon: BookOpen, feature: 'transactions' as const }, { to: '/bills', label: 'Bills & invoices', icon: FileText, feature: 'bills' as const },
  { to: '/inventory', label: 'Inventory', icon: Package, feature: 'inventory' as const }, { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined, feature: 'reports' as const },
];
export default function App() {
  const navigate = useNavigate(), location = useLocation(), cache = useQueryClient();
  const session = useQuery<{ user: User; business: Workspace['business'] }>({ queryKey: ['session'], queryFn: () => api('/auth/session'), retry: false });
  const user = session.data?.user, demo = !user;
  const featureOn = (feature: keyof User['featureToggles']) => demo ? feature === 'customers' || feature === 'transactions' : !!user?.featureToggles?.[feature];
  const workspace = useQuery<Workspace>({ queryKey: ['workspace', user?.id], queryFn: () => api('/workspace'), enabled: !!user, refetchInterval: 30000 });
  const data = workspace.data || (demo ? sample : { ...sample, business: session.data!.business, customers: [], entries: [], products: [], bills: [], paymentRequests: [], notifications: [], monthly: [], totals: { receivable: 0, advance: 0, customers: 0 } });
  const [dialog, setDialog] = useState<DialogConfig | null>(null), [message, setMessage] = useState(''), [search, setSearch] = useState(''), [menu, setMenu] = useState(false), [offline, setOffline] = useState(!navigator.onLine);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [locked, setLocked] = useState(() => { const last = localStorage.getItem('okkhata-activity'); return !!last && Date.now() - parseInt(last) > 5 * 60 * 1000; });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (text: string) => { setMessage(text); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setMessage(''), 3000); };
  const refresh = async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['workspace'] }), cache.invalidateQueries({ queryKey: ['session'] })]); };
  const requireAccount = () => { if (demo) { navigate('/signup'); return false; } if (offline) { toast('Reconnect before saving financial records.'); return false; } return true; };
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('okkhata-auth');
    channel.onmessage = () => { cache.removeQueries({ queryKey: ['workspace'] }); void cache.invalidateQueries({ queryKey: ['session'] }); setDialog(null); };
    return () => channel.close();
  }, [cache]);
  useEffect(() => { const off = () => setOffline(!navigator.onLine); window.addEventListener('online', off); window.addEventListener('offline', off); return () => { window.removeEventListener('online', off); window.removeEventListener('offline', off); }; }, []);
  useEffect(() => {
    if (!user || locked) return;
    let timeout: ReturnType<typeof setTimeout>;
    const lockSession = () => setLocked(true);
    const reset = () => { localStorage.setItem('okkhata-activity', Date.now().toString()); clearTimeout(timeout); timeout = setTimeout(lockSession, 5 * 60 * 1000); };
    const hide = () => { if (!document.hidden) { const last = localStorage.getItem('okkhata-activity'); if (last && Date.now() - parseInt(last) > 5 * 60 * 1000) lockSession(); } };
    window.addEventListener('mousemove', reset); window.addEventListener('keydown', reset); window.addEventListener('touchstart', reset); window.addEventListener('scroll', reset);
    document.addEventListener('visibilitychange', hide);
    reset();
    return () => { window.removeEventListener('mousemove', reset); window.removeEventListener('keydown', reset); window.removeEventListener('touchstart', reset); window.removeEventListener('scroll', reset); document.removeEventListener('visibilitychange', hide); clearTimeout(timeout); };
  }, [user?.id, locked]);
  useEffect(() => {
    if (!user) return;
    const color = user.theme === 'custom' ? user.customColor : palettes.find(p => p.id === user.theme)?.color;
    if (color) document.documentElement.style.setProperty('--primary', color);
    const fontFamilies: Record<string, string> = { 'dm-sans': "'DM Sans', sans-serif", manrope: "Manrope, sans-serif", inter: "Inter, 'DM Sans', sans-serif", 'plus-jakarta': "'Plus Jakarta Sans', 'DM Sans', sans-serif", nunito: "'Nunito Sans', 'DM Sans', sans-serif", lora: "Lora, Georgia, serif", atkinson: "'Atkinson Hyperlegible', Arial, sans-serif" };
    document.documentElement.style.setProperty('--font-family', fontFamilies[user.fontFamily] || fontFamilies['dm-sans']);
    document.documentElement.style.setProperty('--font-scale', String(Math.max(1.25, user.fontScale || 1.25)));
    document.documentElement.dataset.largeText = String(user.fontScale > 1.5);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => document.documentElement.dataset.mode = user.mode === 'system' ? media.matches ? 'dark' : 'light' : user.mode;
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, [user?.theme, user?.mode, user?.customColor, user?.fontFamily, user?.fontScale, user?.language]);
  useEffect(() => { if (workspace.error instanceof ApiError && workspace.error.status === 401) { cache.removeQueries({ queryKey: ['workspace'] }); void cache.invalidateQueries({ queryKey: ['session'] }); navigate('/login'); } }, [workspace.error, cache, navigate]);
  const addCustomer = () => {
    if (!requireAccount()) return;
    setDialog({ layout: 'customer', title: 'Add a customer', subtitle: 'A new relationship, a clear account.', submitLabel: 'Add customer', fields: [
      { name: 'name', label: 'Customer name', required: true, placeholder: 'e.g. Rahul Sharma' }, { name: 'mobile', label: 'Mobile number', type: 'tel', placeholder: '+91 98765 43210' },
      { name: 'email', label: 'Email (optional)', type: 'email' }, { name: 'address', label: 'Address (optional)' }, { name: 'note', label: 'Note (optional)', type: 'textarea' },
    ], onSubmit: async f => { await post('/customers', f); await refresh(); toast('Customer added. You’re ready to make an entry.'); } });
  };
  const addEntry = (kind: 'given' | 'received', customerId?: string, action: 'udhar' | 'advance' | 'payment' = kind === 'given' ? 'udhar' : 'payment') => {
    if (!requireAccount()) return;
    if (!data.customers.some(c => !c.archived)) { addCustomer(); return; }
    const customer = customerId ? data.customers.find(c => c._id === customerId) : null;
    const idempotencyKey = newId();
    setDialog({ layout: 'entry', title: customer ? `Adding to ${customer.name}` : action === 'advance' ? 'Record an advance' : action === 'udhar' ? 'Record udhar' : 'Record a payment', subtitle: kind === 'given' ? 'This increases the outstanding balance.' : 'This reduces the outstanding balance.', submitLabel: 'Save entry', fields: [
      ...(customerId ? [] : [{ name: 'customerId', label: 'Customer', required: true, options: data.customers.filter(c => !c.archived).map(c => ({ value: c._id, label: `${c.name} · ${money(c.balance)}` })) }]),
      { name: 'amount', label: 'Amount (₹)', required: true, type: 'number', min: '0.01', step: '0.01', placeholder: '0.00' }, { name: 'date', label: 'Date and time (your local time)', type: 'datetime-local', value: localDateTime(), max: localDateTime(), required: true }, { name: 'note', label: 'Note (optional)', type: 'textarea', placeholder: 'What was this for?' },
    ], children: <><EntryAttachment/><Calculator/></>, onSubmit: async f => { const amount = toMinor(f.amount); post('/entries', { ...f, customerId: customerId || f.customerId, attachmentId: f.attachmentId || undefined, date: new Date(f.date).toISOString(), amount, kind, action, idempotencyKey }).then(async () => { await refresh(); toast('Entry saved. Your customer balance is up to date.'); }).catch(err => toast('Failed to save entry: ' + err.message)); } });
  };
  const remind = (id: string) => {
    if (!requireAccount()) return;
    const c = data.customers.find(c => c._id === id)!;
    if (c.balance <= 0) { toast('This customer has no outstanding payment.'); return; }
    if (!/^\+?[1-9]\d{7,14}$/.test(c.mobile.replace(/[\s()-]/g, ''))) { toast('Add a valid customer phone number with country code first.'); return; }
    const text = `Hello ${c.name},\n\nA friendly reminder from ${data.business.name}. Your pending amount is ${money(c.balance)}.${c.dueDate ? ` Due date: ${new Date(c.dueDate).toLocaleDateString('en-IN')}.` : ''}\n\nPlease make the payment when convenient. Thank you!\n${data.business.name}`;
    setDialog({ title: 'Remind on WhatsApp', subtitle: 'Review the reminder. You’ll press Send inside WhatsApp.', fields: [{ name: 'message', label: 'Your message', type: 'textarea', value: text, required: true }], submitLabel: 'Continue in WhatsApp', onSubmit: async f => { window.open(`https://wa.me/${c.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(f.message)}`, '_blank', 'noopener,noreferrer'); toast('Continue in WhatsApp to send your message.'); } });
  };
  const authRoute = ['/signup', '/login'].includes(location.pathname);
  if (authRoute) return <AuthPage key={location.pathname} signup={location.pathname === '/signup'}/>;
  if (session.isPending) return <div className="boot"><img src="/icon.svg" alt="OkKhata"/><p>Getting your khata ready…</p></div>;
  if (locked && user) return <LockScreen userId={user.id} name={user.name} onUnlock={() => setLocked(false)} onLogout={async () => { await post('/auth/logout'); cache.clear(); setLocked(false); navigate('/login'); }}/>;
  const currentNav = nav.find(n => n.to === location.pathname) || { label: location.pathname.startsWith('/customers/') ? 'Customer account' : location.pathname === '/notifications' ? 'Notifications' : 'Settings' };
  return <AppContext.Provider value={{ data, user, demo, refresh, toast, open: setDialog, requireAccount, addCustomer, addEntry, remind, search }}><LanguageLayer language={user?.language || 'en'}/><div className={`app-shell ${location.pathname.startsWith('/customers/') ? 'ledger-screen' : ''}`}>
    {menu && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMenu(false)}/>}
    <aside className={`sidebar ${menu ? 'is-open' : ''}`}><Link to="/" className="brand"><img src="/icon.svg" alt=""/>ok<span>khata</span><i/></Link><button className="business-switch" onClick={() => navigate('/settings?tab=business')}><span className="business-icon">{data.business.logo ? <img crossOrigin="use-credentials" src={mediaUrl(data.business.logo.url)} alt=""/> : <BookOpen size={20}/>}</span><span><strong>{data.business.name}</strong><small>Business account</small></span><ChevronDown size={15}/></button>
    <div className="nav-label">WORKSPACE</div><nav>{nav.filter(n => !n.feature || featureOn(n.feature)).map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}><n.icon size={19}/><span>{n.label}</span>{n.to === '/customers' && <em>{data.totals.customers}</em>}</NavLink>)}</nav>
    <div className="nav-label tools-label">PREFERENCES</div><nav>{featureOn('notifications') && <NavLink to="/notifications"><Bell size={19}/><span>Notifications</span>{data.notifications.some(n => !n.readAt) && <i className="notification-dot"/>}</NavLink>}<NavLink to="/settings"><Settings size={19}/><span>Settings</span></NavLink></nav>
    <div className="sidebar-bottom"><button className="account-button" onClick={() => navigate('/settings')}><Avatar name={user?.name || 'Kunal Patel'} photo={user?.photo}/><span><strong>{user?.name || 'Your workspace'}</strong><small>{demo ? 'Sample preview' : 'Business owner'}</small></span><ChevronDown size={15}/></button></div></aside>
    <div className="main-shell"><header className="mobile-brand-header mobile-only">{showMobileSearch ? <div className="search-field" style={{flex:1,marginRight:'10px',borderRadius:'8px',background:'var(--surface)'}}><Search size={18}/><input autoFocus aria-label="Search customers" placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); if (location.pathname !== '/customers') navigate('/customers'); }}/></div> : <div className="brand-logo"><img src="/icon.svg" alt=""/>ok<span>khata</span></div>}<div style={{display:'flex',alignItems:'center',gap:'4px'}}><button className="icon-button" aria-label="Toggle search" onClick={() => setShowMobileSearch(!showMobileSearch)}><Search size={19}/></button>{!showMobileSearch && <Link to="/notifications" className="icon-button notification-button" aria-label="Notifications"><Bell size={19}/>{data.notifications.some(n => !n.readAt) && <i/>}</Link>}</div></header><header className="topbar desktop-only"><div className="header-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu size={21}/></button><span className="breadcrumb">{currentNav.label}</span></div><div className="topbar-right"><label className="global-search"><Search size={17}/><input aria-label="Search" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); if (!['/customers', '/transactions', '/inventory'].includes(location.pathname)) navigate('/customers'); }}/></label><span className={`sync-status ${offline ? 'is-offline' : ''}`}>{offline ? <WifiOff size={14}/> : <span className="live-dot"/>}{offline ? 'Offline' : demo ? 'Sample data' : workspace.isFetching ? 'Updating…' : 'Connected'}</span><Link to="/notifications" className="icon-button notification-button" aria-label="Notifications"><Bell size={19}/>{data.notifications.some(n => !n.readAt) && <i/>}</Link><button className="top-avatar" aria-label="My profile" onClick={() => navigate('/settings')}><Avatar name={user?.name || 'Kunal Patel'} photo={user?.photo}/></button></div></header>
    {demo && <div className="demo-banner"><span><Sparkles size={14}/> You’re exploring a sample workspace.</span><Link to="/signup">Create your own khata <ArrowRightIcon/></Link><Link to="/login" className="demo-signin">Sign in</Link></div>}
    {offline && <div className="connection-banner">You’re offline. Reconnect to save or refresh your records.</div>}
    {workspace.error && <div className="connection-banner" role="alert">Unable to refresh your records. <button className="text-button" onClick={() => void workspace.refetch()}>Try again</button></div>}
    <main className="workspace-main"><Routes><Route path="/" element={<Navigate to="/customers" replace/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="/customers" element={<Customers/>}/><Route path="/customers/:id" element={<CustomerDetail/>}/><Route path="/transactions" element={<Transactions/>}/><Route path="/bills" element={<Bills/>}/><Route path="/inventory" element={<Inventory/>}/><Route path="/reports" element={<Reports/>}/><Route path="/notifications" element={<Notifications/>}/><Route path="/settings" element={<SettingsPage/>}/><Route path="*" element={<div className="empty"><h2>This page is not in your khata.</h2><Link to="/">Back to overview</Link></div>}/></Routes><footer className="workspace-footer"><span>Made for the way you do business.</span><span><ShieldCheck size={13}/> Your business. Your khata.</span></footer></main>
    <nav className="bottom-nav">
      <NavLink to="/dashboard"><LayoutDashboard size={22}/><span>Overview</span></NavLink>
      {featureOn('customers') && <NavLink to="/customers"><Users size={22}/><span>Customers</span></NavLink>}
      {featureOn('transactions') && <NavLink to="/transactions"><BookOpen size={22}/><span>Transactions</span></NavLink>}
      <button onClick={() => setMenu(true)}><Menu size={22}/><span>More</span></button>
    </nav>
    </div>
    {dialog && <FormDialog key={dialog.title} {...dialog} onClose={() => setDialog(null)}/>}{message && <div className="toast" role="status"><Check size={17}/>{message}<button aria-label="Dismiss" onClick={() => setMessage('')}><X size={15}/></button></div>}
  </div></AppContext.Provider>;
}
function ArrowRightIcon() { return <ArrowUpRight size={14}/>; }
