import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Terms of Service | PriorityPay",
  description: "The terms that govern using PriorityPay, including how split rules, identity verification, and money movement through Dwolla and Plaid work.",
  alternates: { canonical: "https://www.prioritypay.co/terms" },
  // Boilerplate legal page -- noindexed so it doesn't compete for crawl
  // budget or get treated as thin/duplicate content; still fully
  // followable/linkable for anyone who lands on it directly.
  robots: { index: false, follow: true },
};

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
      <p>
        While a transfer is in progress, the funds are held by <strong>Dwolla&apos;s financial institution
        partners</strong>, not by PriorityPay. Transfers from your bank into Dwolla typically take 3&ndash;4 business
        days, and transfers from Dwolla into a destination bank account typically take 1&ndash;2 business days. These
        timeframes are estimates, not guarantees, and can vary by financial institution.
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
      <p>
        You manage your Dwolla-enabled Customer Account entirely through PriorityPay -- you won&apos;t separately log
        into Dwolla to view or manage it. We&apos;ll notify you of Customer Account and payment activity relevant to
        your transfers, including when a transfer completes, is delayed, or fails.
      </p>

      <h2>4. Identity Verification &amp; Linked Accounts</h2>
      <p>
        To move real money, Dwolla requires identity verification (name, address, date of birth, and Social Security
        number). PriorityPay forwards this information directly to Dwolla to create your Dwolla customer account and
        does not store your Social Security number or date of birth in its own database. Linking a bank account uses
        Plaid, which connects directly to your bank with your explicit authorization.
      </p>

      <h2>5. How Split Rules Work, Notice &amp; Cancellation</h2>
      <p>
        You control the percentages, caps, and destination accounts in your split rules. Each rule you create or
        change applies automatically to every qualifying deposit into your linked account from that point forward.
        There is no fixed dollar amount and no fixed calendar schedule -- the amount routed under a rule is a
        percentage of whatever deposit triggers it, and the transfer initiates as soon as that deposit is detected.
      </p>
      <p>
        By creating or changing a split rule, you are giving your express authorization for PriorityPay to initiate
        transfers from your linked bank account (the funding source for every split) according to that rule&apos;s
        percentages and destination accounts, for every future deposit, until you change or cancel the rule. Because
        each transfer is triggered by a deposit whose timing and amount we don&apos;t control, we can&apos;t give you
        10 days&apos; advance notice of the amount and date of each individual transfer before it happens. Instead:
        (a) you see and approve the exact percentages and destination accounts before a rule takes effect, (b) any
        change you make takes effect only for deposits received after you save it, and (c) we notify you in the app
        when each transfer completes, is delayed, or fails, so you have a real-time record of what moved and when
        (see Section 3).
      </p>
      <p>
        You can pause, edit, or delete any split rule at any time from your Splits page. A change takes effect
        immediately for future deposits; it does not affect transfers that have already been initiated.
      </p>
      <p>
        We are not responsible for outcomes resulting from split rules you set up incorrectly, forgot to update, or
        intentionally configured in a way you later regret.
      </p>
      {/* NOTE FOR ATTORNEY REVIEW: This section is a good-faith attempt to satisfy Dwolla Platform Agreement Sec.
          2.8.5 ("Recurring Payments") for split rules, which fire automatically per-deposit rather than on a fixed
          amount/schedule. Sec. 2.8.5(ii)/(v) call for 10 days' advance notice of the amount and date of each
          payment -- which is structurally impossible here since transfers are triggered by deposit timing we don't
          control. We've substituted (a) upfront visibility into and consent to a rule's percentages/destinations
          before it takes effect and (b) real-time notice when each transfer executes. Please confirm this
          substitute-notice approach is defensible as substantial compliance with 2.8.5, or tell us what needs to
          change -- this is the one open item from our own pre-Dwolla-submission review. */}

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

      <h2>13. Customer Support &amp; Disputes</h2>
      <p>
        If you have a question or issue with a transfer, your Customer Account, or any payment activity connected to
        your use of the Service -- including a transfer that didn&apos;t go through, went to the wrong place, or
        needs to be disputed -- contact us at{" "}
        <a href="mailto:megan@ignitemysite.com">megan@ignitemysite.com</a> and we&apos;ll help you resolve it,
        including working with Dwolla on your behalf where needed.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:megan@ignitemysite.com">megan@ignitemysite.com</a>.
      </p>
    </LegalPage>
  );
}
