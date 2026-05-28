import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Legal"
        title="Privacy Policy"
        subtitle="Last updated: May 2026"
      />

      <ContentSection narrow>
        <ProseBlock>
          <h2>1. Introduction</h2>
          <p>
            Co-Helper ("we", "our", or "us") operates the Co-Helper digital services outsourcing platform. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when you use our website
            and services.
          </p>

          <h2>2. Information we collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>Account information: name, email address, company name, and role</li>
            <li>Project data: service requirements, timelines, budgets, and attachments</li>
            <li>Communication records: messages exchanged through the platform and with project managers</li>
            <li>Payment-related metadata: billing details where applicable (payments between parties are handled directly)</li>
          </ul>
          <p>We also automatically collect usage data such as IP address, browser type, pages visited, and device information.</p>

          <h2>3. How we use your information</h2>
          <ul>
            <li>To provide, operate, and maintain the platform</li>
            <li>To match client projects with relevant specialists and assign project managers</li>
            <li>To send transactional notifications and service updates</li>
            <li>To improve platform functionality and user experience</li>
            <li>To comply with legal obligations and enforce our terms</li>
          </ul>

          <h2>4. Sharing of information</h2>
          <p>
            We share project details with verified specialists and assigned project managers relevant to your request.
            We do not sell personal data to third parties. We may share information with service providers who assist
            in operating the platform (e.g. hosting, email delivery), subject to confidentiality agreements.
          </p>

          <h2>5. Data retention</h2>
          <p>
            We retain account and transaction data for as long as your account is active or as needed to provide
            services. You may request deletion of your account by contacting us at privacy@co-helper.com.
          </p>

          <h2>6. Your rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, delete, or export your
            personal data, and to object to or restrict certain processing. Contact us to exercise these rights.
          </p>

          <h2>7. Security</h2>
          <p>
            We implement industry-standard security measures including encryption in transit, access controls,
            and regular security reviews. No method of transmission over the internet is 100% secure.
          </p>

          <h2>8. International transfers</h2>
          <p>
            Your data may be processed in the European Union, United States, or other countries where our service
            providers operate. We ensure appropriate safeguards are in place for cross-border transfers.
          </p>

          <h2>9. Contact</h2>
          <p>
            For privacy-related questions, contact us at{" "}
            <a href="mailto:privacy@co-helper.com">privacy@co-helper.com</a>.
          </p>
        </ProseBlock>
      </ContentSection>
    </MarketingLayout>
  )
}
