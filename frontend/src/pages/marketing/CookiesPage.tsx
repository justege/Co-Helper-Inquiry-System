import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"

export default function CookiesPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Legal"
        title="Cookie Policy"
        subtitle="Last updated: May 2026"
      />

      <ContentSection narrow>
        <ProseBlock>
          <h2>1. What are cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help us remember
            your preferences, keep you signed in, and understand how the platform is used.
          </p>

          <h2>2. Cookies we use</h2>

          <h3>Essential cookies</h3>
          <p>Required for the platform to function. These include authentication tokens and session identifiers. You cannot opt out of these without losing access to your account.</p>

          <h3>Functional cookies</h3>
          <p>Remember your preferences such as language and display settings.</p>

          <h3>Analytics cookies</h3>
          <p>Help us understand how visitors use the platform — which pages are visited, how long sessions last, and where errors occur. We use this data to improve the product.</p>

          <h2>3. Third-party cookies</h2>
          <p>
            We may use third-party services (such as authentication providers and analytics tools) that set
            their own cookies. These are governed by the respective third party's privacy policy.
          </p>

          <h2>4. Managing cookies</h2>
          <p>
            Most browsers allow you to refuse or delete cookies through their settings. Disabling essential
            cookies will prevent you from signing in and using the platform.
          </p>

          <h2>5. Updates</h2>
          <p>
            We may update this Cookie Policy from time to time. Continued use of the platform after changes
            constitutes acceptance of the updated policy.
          </p>

          <h2>6. Contact</h2>
          <p>
            Questions about cookies:{" "}
            <a href="mailto:privacy@outsourcesoft.com">privacy@outsourcesoft.com</a>
          </p>
        </ProseBlock>
      </ContentSection>
    </MarketingLayout>
  )
}
