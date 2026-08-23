import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Privacy Policy | PriorityPay",
  description:
    "What information PriorityPay collects, how it's used, and who it's shared with — including Plaid, Stripe, Supabase, Vercel, and, if you use optional features, Twilio and Anthropic.",
  alternates: { canonical: "https://www.prioritypay.co/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 22, 2026">
      <p>
        This Privacy Policy explains what information PriorityPay collects, how it&apos;s used, and who it&apos;s
        shared with when you use PriorityPay (the &quot;Service&quot;), operated by PriorityPay LLC, a Virginia
        limited liability company.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect:</p>
      <ul>
        <li><strong>Account information:</strong> your email address and password (stored securely, hashed — we never see or store your password in plain text).</li>
        <li><strong>Profile information:</strong> details you provide during onboarding, such as your business type and how you handle income.</li>
        <li><strong>Linked account and transaction data:</strong> via Plaid, we receive read-only account balances and transaction data for accounts you choose to connect, used to detect deposits and calculate your split rules. PriorityPay never receives the ability to move money in or out of these accounts.</li>
        <li><strong>Split rules and checklist history:</strong> the percentages, caps, and categories you configure, and records of what PriorityPay calculated for each deposit — which you then complete yourself as a transfer.</li>
        <li><strong>Billing information:</strong> if you subscribe, Stripe processes your payment method directly; PriorityPay does not receive or store your full card number.</li>
        <li><strong>Optional feature data:</strong> if you enable deposit text alerts, your phone number; if you use the in-app Tax Strategy Advisor chat, the questions you ask it.</li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>We use this information to:</p>
      <ul>
        <li>Create and secure your account</li>
        <li>Link bank accounts via Plaid and read balances/transactions needed to detect deposits and run your split rules</li>
        <li>Calculate the transfers your split rules call for, and show you a checklist of what to send and where</li>
        <li>Show you your account balances, split history, and transaction history</li>
        <li>Process your subscription payment via Stripe</li>
        <li>Send an optional text alert when a deposit crosses a threshold you set, if you&apos;ve enabled that feature</li>
        <li>Answer questions you ask the optional Tax Strategy Advisor chat feature, if you use it</li>
        <li>Communicate with you about your account (for example, email confirmation and important account notices)</li>
      </ul>

      <h2>3. Who We Share Information With</h2>
      <p>
        We share information with the service providers that power PriorityPay, and don&apos;t sell your personal
        information to third parties for their own marketing purposes:
      </p>
      <ul>
        <li><strong>Plaid Inc.</strong> -- bank account linking and read-only transaction data. See the <a href="https://plaid.com/legal/" target="_blank" rel="noreferrer">Plaid Privacy Policy</a>.</li>
        <li><strong>Stripe</strong> -- payment processing for your subscription. See the <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">Stripe Privacy Policy</a>.</li>
        <li><strong>Supabase</strong> — our database and authentication provider, which stores your account and app data.</li>
        <li><strong>Vercel</strong> — hosts the PriorityPay application.</li>
        <li><strong>Twilio</strong> — sends deposit-alert text messages once you provide a phone number in Settings; enabled by default, but you can turn it off anytime in Settings.</li>
        <li><strong>Anthropic</strong> — powers the optional Tax Strategy Advisor chat feature, only if you use it; your questions are sent to Anthropic&apos;s API to generate a response.</li>
      </ul>
      <p>We may also disclose information if required by law, or to investigate fraud or protect the security of the Service.</p>

      <h2>4. Data Security</h2>
      <p>
        We use industry-standard measures to protect your information, including encrypted connections (TLS) for
        data in transit, hashed password storage, and encryption at rest (AES-256) for the Plaid access tokens that
        let us read your linked accounts&apos; data. We do not ask for or collect your Social Security number or
        date of birth. No system is completely secure, and we can&apos;t guarantee absolute security.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain account and transaction data for as long as your account is active, and as needed afterward to
        comply with legal, tax, and financial recordkeeping obligations. You can request deletion of your account by
        contacting us; some records may be retained where required by law.
      </p>

      <h2>6. Your Choices</h2>
      <p>
        You can review and update your profile information from within the app, disconnect linked accounts at any
        time from the Accounts page, turn deposit text alerts and the Advisor chat feature on or off in Settings, and
        contact us to request a copy of your data or account deletion.
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
