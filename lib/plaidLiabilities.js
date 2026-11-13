import { plaidClient } from "@/lib/plaid";

// Reads one linked account's debt details from Plaid Liabilities: what is
// owed, the interest rate (APR), the minimum payment and the next due date.
// Returns { debt } on success or { code } when Plaid says why it can't (most
// often ADDITIONAL_CONSENT_REQUIRED: the card was linked before Liabilities
// was requested and the person needs to approve it once).
export async function fetchLiabilityDebt(accessToken, plaidAccountId) {
  try {
    const res = await plaidClient.liabilitiesGet({
      access_token: accessToken,
      options: { account_ids: [plaidAccountId] },
    });
    const account = (res.data.accounts || []).find((a) => a.account_id === plaidAccountId);
    const liabilities = res.data.liabilities || {};
    const balance = Number(account?.balances?.current);
    if (!account || !Number.isFinite(balance)) return { code: "NO_ACCOUNT" };

    const credit = (liabilities.credit || []).find((c) => c.account_id === plaidAccountId);
    const student = (liabilities.student || []).find((c) => c.account_id === plaidAccountId);
    const mortgage = (liabilities.mortgage || []).find((c) => c.account_id === plaidAccountId);

    if (credit) {
      const aprs = credit.aprs || [];
      const purchase = aprs.find((a) => a.apr_type === "purchase_apr") || aprs[0];
      return {
        debt: {
          debtType: "credit_card",
          balance,
          apr: purchase && purchase.apr_percentage != null ? Number(purchase.apr_percentage) : null,
          minPayment: credit.minimum_payment_amount != null ? Number(credit.minimum_payment_amount) : null,
          dueDate: credit.next_payment_due_date || null,
        },
      };
    }
    if (student) {
      return {
        debt: {
          debtType: "student_loan",
          balance,
          apr: student.interest_rate_percentage != null ? Number(student.interest_rate_percentage) : null,
          minPayment: student.minimum_payment_amount != null ? Number(student.minimum_payment_amount) : null,
          dueDate: student.next_payment_due_date || null,
        },
      };
    }
    if (mortgage) {
      return {
        debt: {
          debtType: "other",
          balance,
          apr: mortgage.interest_rate?.percentage != null ? Number(mortgage.interest_rate.percentage) : null,
          minPayment: mortgage.next_monthly_payment != null ? Number(mortgage.next_monthly_payment) : null,
          dueDate: mortgage.next_payment_due_date || null,
        },
      };
    }
    return { debt: { debtType: "credit_card", balance, apr: null, minPayment: null, dueDate: null } };
  } catch (err) {
    const code = err?.response?.data?.error_code || "UNKNOWN";
    if (code === "UNKNOWN") console.error("Plaid liabilitiesGet failed:", err?.response?.data || err);
    return { code };
  }
}
