import LegalPage from "@/components/LegalPage";

export const metadata = {
  title: "Security and Privacy | PrioritySave",
  description: "How PrioritySave protects your data and your bank connections.",
  alternates: { canonical: "https://www.prioritysave.com/security" },
};

// The Tax Savings Quiz is hidden for now, so its chat section is too. Set to
// true to show it again when the quiz comes back.
const SHOW_QUIZ_SECTION = false;

export default function SecurityPage() {
  return (
    <LegalPage title="Security and Privacy" updated="November 2, 2026">
      {SHOW_QUIZ_SECTION && (
        <>
        <h2>The Tax Savings Quiz chat</h2>
        <p>The chat is built to know as little about you as possible.</p>
        <ul>
          <li>It only knows your quiz answers. It cannot see your linked bank accounts, balances, transactions, name or email.</li>
          <li>Before each message is sent, phone numbers, email addresses, Social Security numbers, and card or account numbers are masked. This happens in your browser and again on our server.</li>
          <li>Your chat messages are not saved. We store only a count of messages, to enforce the monthly limit.</li>
          <li>Use &quot;See what was sent&quot; inside the chat to view exactly what goes to the AI.</li>
          <li>The AI answers from PrioritySave&apos;s own tax guides and its general tax knowledge, and may look up official government sources (IRS, SSA and similar) to confirm current-year numbers. Those lookups are built only from your tax question, never from personal details. It is a guide, not a CPA or attorney.</li>
        </ul>
        </>
      )}
      <h2>Your account data</h2>
      <ul>
        <li>Bank connections go through Plaid. We never see or store your bank login.</li>
        <li>Payments go through Stripe. We never see or store your card number.</li>
        <li>Data is encrypted in transit and stored with Supabase, with access limited by per-user security rules.</li>
      </ul>
      <h2>Questions</h2>
      <p>Email us through the <a href="/contact">contact page</a>.</p>
    </LegalPage>
  );
}
