import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Legal"
        title="Privacy Policy"
        subtitle="Last updated: September 2026"
      />

      <ContentSection narrow>
        <ProseBlock>
          <h2>1. Introduction</h2>
          <p>
            Co-Helper ("we", "our", or "us") operates a shared workspace for one-person businesses and the companies they invite.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
            our website and services. Co-Helper is not a marketplace, staffing agency, or payment processor.
          </p>

          <h2>2. Information we collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>Account information: name, email address, company name, and role (workspace owner or invited company)</li>
            <li>Workspace data: invitations, membership, clients, projects, to-dos, hours, and invoices</li>
            <li>Commercial records you choose to keep: price agreements, logged hours, and payment status notes (not card numbers)</li>
            <li>Optional email: if you configure SMTP, we store the host and encrypted password you provide</li>
          </ul>
          <p>We also automatically collect usage data such as IP address, browser type, pages visited, and device information. Authentication is provided by Firebase.</p>

          <h2>3. How we use your information</h2>
          <ul>
            <li>To provide, operate, and maintain each one-person business’s private workspace</li>
            <li>To show jobs only to the workspace owner and the invited company on that job</li>
            <li>To run optional features you enable (file storage, outbound email)</li>
            <li>To send transactional notifications (for example invite or account emails) when configured</li>
            <li>To improve the product and to comply with legal obligations</li>
          </ul>
          <p>
            We do not use your jobs to match you with third-party specialists, assign a Co-Helper project manager,
            or process payments between you and your clients.
          </p>

          <h2>4. Sharing of information</h2>
          <p>
            Job content is visible to members of that workspace who are allowed to see the job (typically the
            workspace owner and the company on the inquiry). We do not sell personal data. We may share information
            with processors who help run the platform, for example:
          </p>
          <ul>
            <li>Hosting and database (for example DigitalOcean)</li>
            <li>Authentication (Firebase)</li>
            <li>AI rewrite (Google Gemini) when you use Edit with AI or the brief helper</li>
            <li>Trello, only if you connect an account and authorize access</li>
          </ul>
          <p>Those processors act on our instructions and under confidentiality terms where applicable.</p>

          <h2>5. Data retention</h2>
          <p>
            We retain workspace and account data for as long as your account is active or as needed to provide the
            service. You may request deletion of your account by contacting us at privacy@co-helper.com.
          </p>

          <h2>6. Your rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, delete, or export your
            personal data, and to object to or restrict certain processing. Contact us to exercise these rights.
          </p>

          <h2>7. Security</h2>
          <p>
            We implement industry-standard security measures including encryption in transit, access controls,
            and regular reviews. No method of transmission over the internet is 100% secure.
          </p>

          <h2>8. International transfers</h2>
          <p>
            Your data may be processed in the European Union, United States, or other countries where our service
            providers operate. We use appropriate safeguards for cross-border transfers where required.
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
