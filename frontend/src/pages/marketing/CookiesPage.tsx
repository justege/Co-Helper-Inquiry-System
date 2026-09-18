import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"

export default function CookiesPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Legal"
        title="Cookie Policy"
        subtitle="Last updated: September 2026"
      />

      <ContentSection narrow>
        <ProseBlock>
          <h2>1. What are cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help us remember
            your preferences, keep you signed in to your workspace, and understand how the product is used.
          </p>

          <h2>2. Cookies we use</h2>

          <h3>Essential cookies</h3>
          <p>
            Required for the product to function. These include Firebase authentication tokens and session
            identifiers. You cannot opt out of these without losing access to your account.
          </p>

          <h3>Functional cookies</h3>
          <p>Remember your preferences such as language and display settings.</p>

          <h3>Analytics cookies</h3>
          <p>
            Help us understand how visitors use marketing pages and the workspace — which pages are visited,
            how long sessions last, and where errors occur. We use this data to improve the product, not to
            match you with third parties.
          </p>

          <h2>3. Third-party cookies</h2>
          <p>
            Sign-in uses Firebase Authentication, which may set its own cookies. Optional Trello connect and
            Edit with AI (Gemini) run after you choose them and do not rely on advertising cookies. Third-party
            cookies are governed by those providers’ privacy policies.
          </p>

          <h2>4. Managing cookies</h2>
          <p>
            Most browsers allow you to refuse or delete cookies through their settings. Disabling essential
            cookies will prevent you from signing in and using the workspace.
          </p>

          <h2>5. Updates</h2>
          <p>
            We may update this Cookie Policy from time to time. Continued use of the product after changes
            constitutes acceptance of the updated policy.
          </p>

          <h2>6. Contact</h2>
          <p>
            Questions about cookies:{" "}
            <a href="mailto:privacy@co-helper.com">privacy@co-helper.com</a>
          </p>
        </ProseBlock>
      </ContentSection>
    </MarketingLayout>
  )
}
