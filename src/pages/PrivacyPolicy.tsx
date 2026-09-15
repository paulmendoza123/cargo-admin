import { Link } from "react-router-dom";
import "./LegalPages.css";

const SUPPORT_EMAIL = "cargotrackph.admin@gmail.com";

export default function PrivacyPolicy() {
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
          <Link className="legal-hero-link" to="/delete-account">Delete an account</Link>
        </div>
      </header>

      <article className="legal-shell legal-card">
        <p className="legal-eyebrow">PRIVACY POLICY</p>
        <h1>How CargoTrackPH handles your information</h1>
        <p className="legal-updated">Effective September 15, 2026</p>
        <p>
          CargoTrackPH connects customers with participating cargo businesses. This policy
          explains the information the service uses and the controls available to you.
        </p>

        <section>
          <h2>Information we collect</h2>
          <ul>
            <li>Account details such as name, email address, phone number, and account role.</li>
            <li>Customer identity documents submitted for account verification.</li>
            <li>Saved addresses, map-pin coordinates, recipient details, and booking information.</li>
            <li>Messages, reviews, payment proofs, and support communications.</li>
            <li>For businesses, registration documents, service details, prices, and profile media.</li>
          </ul>
        </section>

        <section>
          <h2>How we use information</h2>
          <p>
            We use information to authenticate accounts, review business and customer
            applications, match bookings with cargo businesses, calculate applicable pickup
            fees, support shipment coordination, prevent misuse, and improve the service.
          </p>
        </section>

        <section>
          <h2>Sharing and visibility</h2>
          <p>
            Booking details you submit are shared with the cargo business involved in that
            booking. Saved addresses and saved recipients remain private until you select them
            for a booking. Public business profiles, approved reviews, and sponsored listings
            may be visible to CargoTrackPH users. We do not sell personal information.
          </p>
        </section>

        <section>
          <h2>Location and uploaded files</h2>
          <p>
            Location access is used only when you choose to set or update a pickup pin. File and
            photo access is used only for content you select, such as identification documents,
            business documents, profile media, or payment receipts.
          </p>
        </section>

        <section>
          <h2>Storage, security, and retention</h2>
          <p>
            CargoTrackPH uses Supabase for authentication and hosted data storage. We apply
            access controls intended to limit data to authorized users and administrators.
            Information is retained while an account is active and may be kept longer when
            necessary for security, dispute resolution, accounting, fraud prevention, or legal
            obligations.
          </p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            You may review saved customer details in the app, change optional permissions in
            your device settings, and request deletion of your account. Customers can start
            deletion from Profile → Privacy &amp; account. Business users can use our public
            deletion-request page.
          </p>
          <Link className="legal-button" to="/delete-account">View account deletion options</Link>
        </section>

        <section>
          <h2>Contact us</h2>
          <p>
            For privacy questions or account support, email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </section>
      </article>

      <footer className="legal-footer">
        <div className="legal-shell">© 2026 CargoTrackPH</div>
      </footer>
    </main>
  );
}
