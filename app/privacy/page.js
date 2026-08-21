import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Privacy Policy | PriorityPay",
  description: "What information PriorityPay collects, how it's used, and who it's shared with -- including Dwolla, Plaid, Supabase, and Vercel.",
  alternates: { canonical: "https://www.prioritypay.co/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 17, 2026">
      <p>
        This Privacy Policy explains what information PriorityPay collects, how it&apos;s used, and who it&apos;s
        shared with when you use PriorityPay (the &quot;Service&quot;), operated by PriorityPay LLC, a Virginia
        limited liability company.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect:</p>
      <ul>
        <li><strong>Account information:</strong> your email address and password (stored securely, hashed -- we never see or store your password in plain text).</li>
        <li><strong>Profile information:</strong> details you provide during onboarding, such as your business type and how you handle income.</li>
        <li><strong>Identity verification information:</strong> name, address, date of birth, and Social Security number, collected only to create your Dwolla customer account. This is sent directly to Dwolla and is <strong>not stored in PriorityPay&apos;s own database</strong>.</li>
        <li><strong>Linked account and transaction data:</strong> via Plaid, we receive account balances and transaction data for accounts you choose to connect, used to calculate and execute your split rules.</li>
        <li><strong>Split rules and transfer history:</strong> the percentages, caps, and categories you configure, and records of transfers made on your behalf.</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>We use this information to:</p>
      <ul>
        <li>Create and secure your account</li>
        <li>Verify your identity with Dwolla, as required to move money</li>
        <li>Link bank accounts via Plaid and read balances/transactions needed to run your split rules</li>
        <li>Execute the transfers you&apos;ve configured</li>
        <li>Show you your account balances, split history, and transaction history</li>
        <li>Communicate with you about your account (for example, email confirmation and important account notices)</li>
      </ul>

      <h2>3. Who We Share Information With</h2>
      <p>
        We share information with the service providers that power PriorityPay, and don&apos;t sell your personal
        information to third parties for their own marketing purposes:
      </p>
      <ul>
        <li><strong>Dwolla, Inc.</strong> -- identity verification and money movement. See the <a href="https://www.dwolla.com/legal/privacy" target="_blank" rel="noreferrer">Dwolla Privacy Policy</a>.</li>
        <li><strong>Plaid Inc.</strong> -- bank account linking and transaction data. See the <a href="https://plaid.com/legal/" target="_blank" rel="noreferrer">Plaid Privacy Policy</a>.</li>
        <li><strong>Supabase</strong> -- our database and authentication provider, which stores your account and app data.</li>
        <li><strong>Vercel</strong> -- hosts the PriorityPay application.</li>
      </ul>
      <p>We may also disclose information if required by law, or to investigate fraud or protect the security of the Service.</p>

      <h2>4. Data Security</h2>
      <p>
        We use industry-standard measures to protect your information, including encrypted connections (TLS) for
        data in transit, hashed password storage, and not storing sensitive identity documents (SSN, date of birth)
        in our own database. No system is completely secure, and we can&apos;t guarantee absolute security.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain account and transaction data for as long as your account is active, and as needed afterward to
        comply with legal, tax, and financial recordkeeping obligations (including Dwolla&apos;s own requirements).
        You can request deletion of your account by contacting us; some records may be retained where required by
        law.
      </p>

      <h2>6. Your Choices</h2>
      <p>
        You can review and update your profile information from within the app, disconnect linked accounts at any
        time from the Accounts page, and contact us to request a copy of your data or account deletion.
      </p>

      <h2>7. Children&apos;s Privacy</h2>
      <p>PriorityPay is not intended for use by anyone under 18, and we don&apos;t knowingly collect information from children.</p>

      <h2>8. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be reflected by an updated &quot;Last updated&quot; date above.</p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy or your data? Reach us at{" "}
        <a href="mailto:megan@ignitemysite.com">megan@ignitemysite.com</a>.
      </p>
    </LegalPage>
  );
}
