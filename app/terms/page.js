import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Terms of Service | PriorityPay" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 17, 2026">
      <p>
        <em>
          This is a starting-point Terms of Service template prepared for PriorityPay. It has not been reviewed by an
          attorney and should be reviewed by qualified legal counsel -- and updated with your specific business
          details -- before it is relied on as a binding agreement with real customers.
        </em>
      </p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of PriorityPay (the
        &quot;Service&quot;), operated by PriorityPay LLC, a Virginia limited liability company (&quot;PriorityPay,&quot;
        &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using the Service, you agree to be
        bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. What PriorityPay Does</h2>
      <p>
        PriorityPay lets you define percentage-based rules for how deposits into a linked bank account should be
        automatically routed to other accounts you connect (for example: savings, tax reserve, retirement, or
        investment accounts). PriorityPay itself does not hold your funds. Money movement between accounts is
        performed by <strong>Dwolla, Inc.</strong>, a licensed payment processor, and account connections are made
        through <strong>Plaid Inc.</strong>, a third-party account-linking service. Your use of these money-movement
        features is also governed by Dwolla&apos;s and Plaid&apos;s own terms, linked below.
      </p>

      <h2>2. Not Financial or Investment Advice</h2>
      <p>
        PriorityPay is a money-organization tool, not a financial advisor, broker-dealer, tax preparer, or investment
        adviser. Nothing in the Service -- including suggested percentages, category names like &quot;Retirement&quot;
        or &quot;Investments,&quot; or any prompts to set up outside accounts -- constitutes financial, investment,
        tax, or legal advice. You are solely responsible for your own financial decisions and should consult a
        licensed professional before making them.
      </p>

      <h2>3. Your Account</h2>
      <p>
        You must provide accurate information when creating an account and when completing identity verification
        with Dwolla. You&apos;re responsible for keeping your login credentials confidential and for all activity
        under your account. Tell us right away if you suspect unauthorized access.
      </p>

      <h2>4. Identity Verification &amp; Linked Accounts</h2>
      <p>
        To move real money, Dwolla requires identity verification (name, address, date of birth, and Social Security
        number). PriorityPay forwards this information directly to Dwolla to create your Dwolla customer account and
        does not store your Social Security number or date of birth in its own database. Linking a bank account uses
        Plaid, which connects directly to your bank with your explicit authorization.
      </p>

      <h2>5. Split Rules Are Your Responsibility</h2>
      <p>
        You control the percentages, caps, and destination accounts in your split rules. PriorityPay executes them as
        configured. We are not responsible for outcomes resulting from split rules you set up incorrectly, forgot to
        update, or intentionally configured in a way you later regret.
      </p>

      <h2>6. Fees</h2>
      <p>
        PriorityPay offers a 30-day free trial starting from the date you create an account. After the trial ends,
        continued use of the Service requires a paid subscription, currently <strong>$19 per month</strong>, billed
        through Stripe to the payment method you provide. If your trial ends without an active subscription, your
        account moves to a read-only mode: you can still view your split rules, dashboard, and transfer history, but
        connecting new accounts and executing new transfers are paused until you subscribe. We may change the
        subscription price going forward, but any change will be disclosed to you before it takes effect for your
        account. Dwolla and your financial institution may charge their own fees separately, which are disclosed by
        them.
      </p>

      <h2>7. Prohibited Use</h2>
      <p>
        You agree not to use the Service for any unlawful purpose, to violate Dwolla&apos;s or Plaid&apos;s terms, to
        attempt to move funds you&apos;re not authorized to move, or to interfere with the Service&apos;s normal
        operation.
      </p>

      <h2>8. Disclaimers &amp; Limitation of Liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. To the fullest extent permitted by
        law, PriorityPay is not liable for indirect, incidental, or consequential damages arising from your use of
        the Service, including delays, failures, or errors in transfers initiated through Dwolla or account data
        provided through Plaid.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using the Service and close your account at any time. We may suspend or terminate accounts that
        violate these Terms or that Dwolla or Plaid require us to restrict.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes take effect
        constitutes acceptance of the updated Terms.
      </p>

      <h2>11. Third-Party Terms</h2>
      <p>
        Because PriorityPay relies on Dwolla and Plaid to move money and link accounts, using PriorityPay also means
        agreeing to their terms and privacy policies:
      </p>
      <ul>
        <li>
          <a href="https://www.dwolla.com/legal/dwolla-account-terms-of-service" target="_blank" rel="noreferrer">
            Dwolla Terms of Service
          </a>
        </li>
        <li>
          <a href="https://www.dwolla.com/legal/privacy" target="_blank" rel="noreferrer">
            Dwolla Privacy Policy
          </a>
        </li>
        <li>
          <a href="https://plaid.com/legal/" target="_blank" rel="noreferrer">
            Plaid End User Privacy Policy &amp; Terms
          </a>
        </li>
      </ul>

      <h2>12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the Commonwealth of Virginia, without regard to conflict-of-law
        principles. Any dispute arising from these Terms or the Service will be subject to the exclusive
        jurisdiction of the state and federal courts located in Virginia.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:megan@ignitemysite.com">megan@ignitemysite.com</a>.
      </p>
    </LegalPage>
  );
}
