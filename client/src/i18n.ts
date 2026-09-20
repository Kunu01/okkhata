import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Language } from './types';

export const languageOptions: { id: Language; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { id: 'hinglish', label: 'Hinglish', native: 'Hinglish' },
];

const en = [
  'Overview|अवलोकन|ઝાંખી|Overview', 'Customers|ग्राहक|ગ્રાહકો|Customers', 'Transactions|लेन-देन|વ્યવહારો|Transactions', 'Bills & invoices|बिल और इनवॉइस|બિલ અને ઇનવૉઇસ|Bills aur invoices', 'Inventory|इन्वेंटरी|ઇન્વેન્ટરી|Inventory', 'Reports|रिपोर्ट|રિપોર્ટ|Reports', 'Notifications|सूचनाएं|સૂચનાઓ|Notifications', 'Settings|सेटिंग्स|સેટિંગ્સ|Settings',
  'Add customer|ग्राहक जोड़ें|ગ્રાહક ઉમેરો|Customer add karein', 'New entry|नई एंट्री|નવી એન્ટ્રી|New entry', 'Receive payment|भुगतान प्राप्त करें|ચુકવણી મેળવો|Payment receive karein', 'Give credit|उधार दें|ઉધાર આપો|Credit dein', 'Record a payment|भुगतान दर्ज करें|ચુકવણી નોંધો|Payment record karein', 'Save payment|भुगतान सेव करें|ચુકવણી સાચવો|Payment save karein', 'Save credit entry|उधार एंट्री सेव करें|ઉધાર એન્ટ્રી સાચવો|Credit entry save karein', 'Cancel|रद्द करें|રદ કરો|Cancel', 'Save|सेव करें|સાચવો|Save', 'Close dialog|डायलॉग बंद करें|ડાયલોગ બંધ કરો|Dialog close karein', 'Customer|ग्राहक|ગ્રાહક|Customer', 'Amount (₹)|राशि (₹)|રકમ (₹)|Amount (₹)', 'Note (optional)|नोट (वैकल्पिक)|નોંધ (વૈકલ્પિક)|Note (optional)',
  'My profile|मेरी प्रोफ़ाइल|મારી પ્રોફાઇલ|Meri profile', 'Business details|व्यवसाय विवरण|વ્યવસાય વિગતો|Business details', 'Features|फीचर्स|ફીચર્સ|Features', 'Security & app lock|सुरक्षा और ऐप लॉक|સુરક્ષા અને એપ લોક|Security aur app lock', 'Your devices|आपके डिवाइस|તમારા ઉપકરણો|Aapke devices', 'Appearance|दिखावट|દેખાવ|Appearance', 'Personal profile|व्यक्तिगत प्रोफ़ाइल|વ્યક્તિગત પ્રોફાઇલ|Personal profile', 'Business profile|व्यवसाय प्रोफ़ाइल|બિઝનેસ પ્રોફાઇલ|Business profile', 'English|अंग्रेज़ी|અંગ્રેજી|English', 'Hindi|हिन्दी|હિન્દી|Hindi', 'Gujarati|गुजराती|ગુજરાતી|Gujarati', 'Hinglish|हिंग्लिश|હિંગ્લિશ|Hinglish', 'Language|भाषा|ભાષા|Language',
  'Light|लाइट|લાઇટ|Light', 'Dark|डार्क|ડાર્ક|Dark', 'System|सिस्टम|સિસ્ટમ|System', 'Typeface|फ़ॉन्ट|ફોન્ટ|Font', 'Text size|टेक्स्ट आकार|ટેક્સ્ટ કદ|Text size', 'Restore the original OkKhata theme|मूल OkKhata थीम बहाल करें|મૂળ OkKhata થીમ પુનઃસ્થાપિત કરો|Original OkKhata theme restore karein', 'Choose what you need|अपनी जरूरत चुनें|તમારી જરૂરિયાત પસંદ કરો|Jo chahiye woh choose karein', 'Bills & invoices|बिल और इनवॉइस|બિલ અને ઇનવૉઇસ|Bills aur invoices', 'Reports|रिपोर्ट|રિપોર્ટ|Reports',
  'Your transactions|आपके लेन-देन|તમારા વ્યવહારો|Aapke transactions', 'Your customers|आपके ग्राहक|તમારા ગ્રાહકો|Aapke customers', 'Recent transactions|हाल के लेन-देन|તાજેતરના વ્યવહારો|Recent transactions', 'Account history|खाते का इतिहास|ખાતાનો ઇતિહાસ|Account history', 'Pay online|ऑनलाइन भुगतान|ઑનલાઇન ચુકવણી|Online pay karein', 'Remind on WhatsApp|WhatsApp पर याद दिलाएं|WhatsApp પર યાદ અપાવો|WhatsApp par remind karein', 'Create invoice|इनवॉइस बनाएं|ઇનવૉઇસ બનાવો|Invoice create karein', 'Add product|उत्पाद जोड़ें|ઉત્પાદન ઉમેરો|Product add karein', 'Download report|रिपोर्ट डाउनलोड करें|રિપોર્ટ ડાઉનલોડ કરો|Report download karein', 'Mark all as read|सबको पढ़ा हुआ करें|બધાને વાંચેલા કરો|Sabko read karein', 'All entries|सभी एंट्री|બધી એન્ટ્રીઓ|All entries', 'You gave|आपने दिया|તમે આપ્યું|Aapne diya', 'You received|आपने प्राप्त किया|તમને મળ્યું|Aapko mila', 'Reversals|रिवर्सल|રિવર્સલ|Reversals', 'Archived|संग्रहीत|આર્કાઇવ્ડ|Archived', 'Outstanding|बकाया|બાકી|Outstanding', 'Settled|निपटाया गया|સેટલ થયેલ|Settled',
].map(row => row.split('|') as [string, string, string, string]);

const dictionaries: Record<Language, Record<string, string>> = { en: {}, hi: {}, gu: {}, hinglish: {} };
for (const [source, hi, gu, hinglish] of en) { dictionaries.en[source] = source; dictionaries.hi[source] = hi; dictionaries.gu[source] = gu; dictionaries.hinglish[source] = hinglish; }
const reverse: Record<string, string> = {};
for (const row of en) for (const value of row) reverse[value] = row[0];

export function applyLanguage(language: Language) {
  document.documentElement.lang = language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : 'en-IN';
  document.documentElement.dataset.language = language;
  const dictionary = dictionaries[language] || dictionaries.en;
  const walker = document.createTreeWalker(document.getElementById('root') || document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = []; let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  for (const text of nodes) {
    const parent = text.parentElement; if (!parent || ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(parent.tagName)) continue;
    const raw = text.nodeValue || ''; const trimmed = raw.trim(); if (!trimmed) continue;
    const source = reverse[trimmed] || trimmed; const translated = dictionary[source];
    if (translated && translated !== trimmed) text.nodeValue = raw.replace(trimmed, translated);
  }
}

export function LanguageLayer({ language }: { language: Language }) {
  const location = useLocation();
  useEffect(() => { const id = window.setTimeout(() => applyLanguage(language), 0); return () => window.clearTimeout(id); });
  useEffect(() => { applyLanguage(language); }, [language, location.pathname, location.search]);
  return null;
}
