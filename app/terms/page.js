import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Terms of Service | PriorityPay",
  description:
    "The terms that govern using PriorityPay, including how split calculations work, how Plaid account linking works, and that you -- not PriorityPay -- complete every transfer.",
  alternates: { canonical: "https://www.prioritypay.co/terms" },
  // Boilerplate legal page -- noindexed so it doesn't compete for crawl
  // budget or get treated as thin/duplicate content; still fully
  // followable/linkable for anyone who lands on it directly.
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 22, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of PriorityPay (the
        &quot;Service&quot;), operated by PriorityPay LLC, a Virginia limited liability company (&quot;PriorityPay,&quot;
        &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using the Service, you agree to be
        bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. What PriorityPay Does</h2>
      <p>
        PriorityPay lets you define percentage-based split rules for deposits into a bank account you connect (for
        example: savings, tax reserve, retirement, or investment accounts). When a qualifying deposit lands,
        PriorityPay calculates exactly how much should go to each category under your rules and shows you a
        checklist of transfers to make.
      </p>
      <p>
        <strong>PriorityPay does not move your money.</strong> We do not hold your funds, initiate transfers, or have
        the ability to withdraw from or deposit into any account you connect. Every transfer PriorityPay calculates
        is one you complete yourself, using your own bank&apos;s app, website, or other transfer method. Account
        connections are made through <strong>Plaid Inc.</strong>, a third-party account-linking service, which gives
        PriorityPay read-only access to balances and transaction data -- never the ability to move funds. Your use of
        Plaid&apos;s linking feature is also governed by Plaid&apos;s own terms, linked below.
      </p>
      <p>
        If we later add an optional feature that lets PriorityPay initiate transfers on your behalf through a
        licensed payment processor, that feature will be off by default, will require your separate and explicit
        authorization before it&apos;s turned on for your account, and these Terms will be updated first to describe
        exactly how it works.
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
        You must provide accurate information when creating an account. You&apos;re responsible for keeping your
        login credentials confidential and for all activity under your account. Tell us right away if you suspect
        unauthorized access.
      </p>

      <h2>4. Linked Accounts</h2>
      <p>
        Connecting a bank account or other financial account uses Plaid, which links directly to your institution
        with your explicit authorization and gives PriorityPay read-only access to that account&apos;s balance and
        transaction history. PriorityPay uses this data solely to detect deposits, calculate your split rules, and
        display your balances and history back to you. You can disconnect a linked account at any time from the
        Accounts page.
      </p>

      <h2>5. How Split Rules Work -- A Checklist, Not Automatic Transfers</h2>
      <p>
        You control the percentages, caps, and destination categories in your split rules. Each rule you create or
        change applies automatically to every qualifying deposit into your linked account from that point forward --
        but &quot;applies&quot; means PriorityPay recalculates and updates your checklist, not that money moves on its
        own. There is no fixed dollar amount and no fixed calendar schedule: the amount shown for each category is a
        percentage of whatever deposit triggered the calculation, computed the moment that deposit is detected.
      </p>
      <p>
        You are responsible for actually completing each transfer on your checklist, using whatever method your own
        bank supports. PriorityPay marks a transfer as done only after you confirm you&apos;ve sent it -- we have no
        independent way to verify that a transfer you mark complete actually reached its destination, since we never
        touch the transfer itself.
      </p>
      <p>
        You can pause, edit, or delete any split rule at any time from your Splits page. A change takes effect
        immediately for future deposits; it has no effect on checklist items already generated for past deposits.
      </p>
      <p>
        We are not responsible for outcomes resulting from split rules you set up incorrectly, forgot to update,
        intentionally configured in a way you later regret, or checklist items you never actually completed.
      </p>

      <h2>6. Fees</h2>
      <p>
        PriorityPay offers a 30-day free trial starting from the date you create an account. After the trial ends,
        continued use of the Service requires a paid subscription, currently <strong>$7 per month</strong>, billed
        through Stripe to the payment method you provide. If your trial ends without an active subscription, your
        account moves to a read-only mode: you can still view your split rules, dashboard, and history, but
        connecting new accounts is paused until you subscribe. We may change the subscription price going forward,
        but any change will be disclosed to you before it takes effect for your account.
      </p>

      <h2>7. Prohibited Use</h2>
      <p>
        You agree not to use the Service for any unlawful purpose, to violate Plaid&apos;s terms, to misrepresent
        account ownership when linking an account, or to interfere with the Service&apos;s normal operation.
      </p>

      <h2>8. Disclaimers &amp; Limitation of Liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. To the fullest extent permitted by
        law, PriorityPay is not liable for indirect, incidental, or consequential damages arising from your use of
        the Service, including inaccurate account data provided through Plaid, or delays, failures, or errors in
        transfers that you initiate yourself based on PriorityPay&apos;s calculations.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using the Service and close your account at any time. We may suspend or terminate accounts that
        violate these Terms or that Plaid requires us to restrict.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes take effect
        constitutes acceptance of the updated Terms.
      </p>

      <h2>11. Third-Party Terms</h2>
      <p>
        Because PriorityPay relies on Plaid to link and read your accounts, using PriorityPay also means agreeing to
        Plaid&apos;s own terms and privacy policy:
      </p>
      <ul>
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

      <h2>13. Customer Support</h2>
      <p>
        If you have a question or issue with your split calculations, account linking, or anything else about the
        Service, contact us at <a href="mailto:megan@ignitemysite.com">megan@ignitemysite.com</a> and we&apos;ll help
        you resolve it. Because PriorityPay never initiates a transfer, a dispute about a specific transfer you sent
        is between you and your bank -- we&apos;re glad to help you track down what our checklist showed at the time,
        but we can&apos;t reverse or trace the transfer itself.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:megan@ignitemysite.com">megan@ignitemysite.com</a>.
      </p>
    </LegalPage>
  );
}
