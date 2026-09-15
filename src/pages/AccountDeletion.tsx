import { Link } from "react-router-dom";
import "./LegalPages.css";

const SUPPORT_EMAIL = "cargotrackph.support@gmail.com";
const REQUEST_SUBJECT = "CargoTrackPH account deletion request";
const REQUEST_BODY = `Registered email:\nAccount type (Customer or Business):\nFull name / business name:\n\nI request deletion of my CargoTrackPH account.`;
const REQUEST_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(REQUEST_SUBJECT)}&body=${encodeURIComponent(REQUEST_BODY)}`;

export default function AccountDeletion() {
  return (
    <main className="legal-page">
      <header className="legal-hero">
        <div className="legal-shell legal-hero-inner">
          <Link className="legal-brand" to="/privacy" aria-label="CargoTrackPH privacy policy">
            <span className="legal-brand-mark" aria-hidden="true">CT</span>
            <span>
              <strong>CargoTrackPH</strong>
              <small>Privacy &amp; account support</small>
            </span>
          </Link>
          <Link className="legal-hero-link" to="/privacy">Privacy policy</Link>
        </div>
      </header>

      <article className="legal-shell legal-card">
        <p className="legal-eyebrow">ACCOUNT DELETION</p>
        <h1>Delete your CargoTrackPH account</h1>
        <p className="legal-lead">
          Choose the process for your account type. Never include your password, one-time code,
          or other sign-in credentials in a deletion request.
        </p>

        <div className="legal-option-grid">
          <section className="legal-option">
            <span className="legal-step">Customer</span>
            <h2>Delete directly in the app</h2>
            <ol>
              <li>Sign in to your customer account.</li>
              <li>Open Profile, then Privacy &amp; account.</li>
              <li>Select Delete my account and follow the confirmation steps.</li>
            </ol>
            <p>
              If you cannot sign in, send a request from the email registered to the account.
            </p>
          </section>

          <section className="legal-option">
            <span className="legal-step">Business</span>
            <h2>Send a deletion request</h2>
            <p>
              Business accounts are reviewed before deletion so active bookings, disputes, and
              records that must be retained are handled safely.
            </p>
            <a className="legal-button" href={REQUEST_URL}>Email deletion request</a>
          </section>
        </div>

        <section>
          <h2>What happens after a request</h2>
          <ol>
            <li>We verify the request using the account’s registered email address.</li>
            <li>We check for active bookings, unresolved payments, disputes, or security holds.</li>
            <li>Eligible account data and sign-in access are deleted or de-identified.</li>
          </ol>
          <p>
            Some transaction, fraud-prevention, accounting, or legal records may be retained for
            the period required by applicable obligations. They are not kept for unrelated use.
          </p>
        </section>

        <section className="legal-contact-box">
          <h2>Need help?</h2>
          <p>
            Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your registered
            email address and include your account type and full name or business name.
          </p>
        </section>
      </article>

      <footer className="legal-footer">
        <div className="legal-shell">© 2026 CargoTrackPH · <Link to="/privacy">Privacy policy</Link></div>
      </footer>
    </main>
  );
}
