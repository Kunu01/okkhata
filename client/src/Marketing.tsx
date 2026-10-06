import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, BookOpen, Smartphone, Zap, CheckCircle2 } from 'lucide-react';

export function MarketingHeader() {
  return (
    <header className="marketing-header">
      <div className="marketing-container">
        <Link to="/" className="marketing-brand">
          <img src="/icon.svg" alt="OkKhata Logo" width="32" height="32" />
          <span>ok<strong>khata</strong></span>
        </Link>
        <nav className="marketing-nav">
          <Link to="/login" className="text-button">Sign In</Link>
          <Link to="/signup" className="button primary">Get Started Free</Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-container footer-grid">
        <div className="footer-col">
          <h3>OkKhata</h3>
          <p>Your business, balanced. The simple, secure digital ledger for modern businesses.</p>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
        </div>
        <div className="footer-col">
          <h4>Contact Us</h4>
          <p>Email: support@okkhata.com</p>
          <p>Phone: +91 98765 43210</p>
          <p>Address: 123 Business Avenue, Tech Park, Bengaluru, Karnataka 560001, India</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} OkKhata Technologies. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="marketing-page">
      <MarketingHeader />
      
      <main>
        {/* Hero Section with CTA above the fold */}
        <section className="hero-section">
          <div className="marketing-container hero-grid">
            <div className="hero-content">
              <h1>Replace your paper khata with a smart digital ledger.</h1>
              <p>Manage customers, track udhar, and collect payments faster. 100% free, safe, and secure for your business.</p>
              <div className="hero-cta">
                <Link to="/signup" className="button primary large">
                  Create your free account <ArrowRight size={18} />
                </Link>
                <Link to="/dashboard" className="button large secondary">
                  Try interactive demo
                </Link>
              </div>
            </div>
            <div className="hero-visual">
              <div className="app-mockup">
                <img src="/icon.svg" alt="OkKhata App" className="mockup-icon" />
                <div className="mockup-balance">₹ 1,24,500</div>
                <div className="mockup-label">Total to collect</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="marketing-container">
            <h2 className="section-title">Everything you need to run your business</h2>
            <div className="features-grid">
              <div className="feature-card">
                <BookOpen className="feature-icon" size={32} />
                <h3>Digital Ledger</h3>
                <p>Record every transaction instantly. Never lose a paper record again.</p>
              </div>
              <div className="feature-card">
                <Smartphone className="feature-icon" size={32} />
                <h3>WhatsApp Reminders</h3>
                <p>Send polite payment reminders directly via WhatsApp to get paid 3x faster.</p>
              </div>
              <div className="feature-card">
                <ShieldCheck className="feature-icon" size={32} />
                <h3>100% Secure</h3>
                <p>Your data is backed up to the cloud automatically. Safe from loss or theft.</p>
              </div>
              <div className="feature-card">
                <Zap className="feature-icon" size={32} />
                <h3>Lightning Fast</h3>
                <p>Works offline and syncs instantly when you connect. Zero waiting.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />

      {/* Sticky Mobile CTA */}
      <div className="sticky-mobile-cta mobile-only">
        <Link to="/signup" className="button primary full">
          Get Started Free <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

export function ThankYouPage() {
  return (
    <div className="marketing-page centered-page">
      <MarketingHeader />
      <main className="marketing-container text-center">
        <div className="success-icon-large">
          <CheckCircle2 size={64} />
        </div>
        <h1>Thank you!</h1>
        <p className="large-text">Your request has been processed successfully.</p>
        <Link to="/" className="button primary" style={{ marginTop: '2rem', display: 'inline-flex' }}>Return to home</Link>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="marketing-page">
      <MarketingHeader />
      <main className="marketing-container document-page">
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString('en-IN')}</p>
        
        <h2>1. Introduction</h2>
        <p>Welcome to OkKhata. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>

        <h2>2. The data we collect about you</h2>
        <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
        <ul>
          <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
          <li><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
          <li><strong>Financial Data</strong> includes bank account and payment card details.</li>
          <li><strong>Transaction Data</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
        </ul>

        <h2>3. How we use your personal data</h2>
        <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
        <ul>
          <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
          <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
          <li>Where we need to comply with a legal or regulatory obligation.</li>
        </ul>
        
        <h2>4. Data Security</h2>
        <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.</p>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function TermsConditions() {
  return (
    <div className="marketing-page">
      <MarketingHeader />
      <main className="marketing-container document-page">
        <h1>Terms & Conditions</h1>
        <p>Last updated: {new Date().toLocaleDateString('en-IN')}</p>

        <h2>1. Agreement to Terms</h2>
        <p>By viewing or using this website, which can be accessed at okkhata.com, you are agreeing to be bound by these website Terms and Conditions of Use and agree that you are responsible for the agreement with any applicable local laws.</p>

        <h2>2. Use License</h2>
        <p>Permission is granted to temporarily download one copy of the materials on OkKhata's Website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>

        <h2>3. Disclaimer</h2>
        <p>All the materials on OkKhata's Website are provided "as is". OkKhata makes no warranties, may it be expressed or implied, therefore negates all other warranties. Furthermore, OkKhata does not make any representations concerning the accuracy or reliability of the use of the materials on its Website or otherwise relating to such materials or any sites linked to this Website.</p>

        <h2>4. Limitations</h2>
        <p>OkKhata or its suppliers will not be hold accountable for any damages that will arise with the use or inability to use the materials on OkKhata's Website, even if OkKhata or an authorize representative of this Website has been notified, orally or written, of the possibility of such damage.</p>
      </main>
      <MarketingFooter />
    </div>
  );
}
