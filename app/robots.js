// Generates /robots.txt. Disallows the authenticated app surface (which
// requires login anyway and has no metadata/content to index) and API
// routes, and points crawlers at the sitemap for the actual public
// marketing/calculator/guide pages.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/accounts",
        "/splits",
        "/simulator",
        "/closeout",
        "/tax-summary",
        "/history",
        "/settings",
        "/onboarding",
      ],
    },
    sitemap: "https://www.prioritypay.co/sitemap.xml",
  };
}
