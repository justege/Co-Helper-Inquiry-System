import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"

export default function TermsPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Legal"
        title="Terms of Service"
        subtitle="Last updated: September 2026"
      />

      <ContentSection narrow>
        <ProseBlock>
          <h2>1. Agreement</h2>
          <p>
            By accessing or using Co-Helper, you agree to these Terms of Service. If you do not agree,
            you may not use the service.
          </p>

          <h2>2. What Co-Helper is</h2>
          <p>
            Co-Helper is software for a workspace owned by a one-person business. You invite the companies
            you already work with and run projects with shared to-dos, hours, rates,
            agreements, time logs, and payment records. We do not match companies with operators, assign a
            project manager, hold escrow, or process payments. We are not a party to the commercial
            relationship between a one-person business and a company.
          </p>

          <h2>3. Account registration</h2>
          <p>
            You must provide accurate information when creating an account. One-person business accounts use
            the workspace sign-up path. Companies typically join with an invite token. You are responsible for
            keeping your credentials confidential and for activity under your account.
          </p>

          <h2>4. Company obligations</h2>
          <ul>
            <li>Use an invite from a one-person business you know, or only open jobs inside a workspace you belong to</li>
            <li>Keep briefs, chat, and documents accurate for the other party</li>
            <li>Honour rates you agree inside the workspace; payment still happens off-platform</li>
            <li>Not use the service for unlawful or fraudulent purposes</li>
          </ul>

          <h2>5. One-person business obligations</h2>
          <ul>
            <li>Invite only companies you intend to work with</li>
            <li>Keep services, jobs, hours, and payment logs accurate</li>
            <li>Use optional integrations (such as Trello) only with accounts you are authorized to connect</li>
            <li>Not use Edit with AI to generate unlawful, deceptive, or infringing content</li>
          </ul>

          <h2>6. Fees and payments</h2>
          <p>
            The workspace is $9 USD per month until 31 December 2026, then $49 USD per month with no discount,
            as described on the Pricing page. There is no other plan. Payment records in Co-Helper are logs
            only. You remain responsible for invoicing, tax, and transferring money outside the product.
            Companies invited into a workspace do not pay Co-Helper.
          </p>

          <h2>7. Intellectual property</h2>
          <p>
            The Co-Helper product, branding, and software are owned by Co-Helper. You retain ownership of
            content you upload (briefs, files, messages) and grant us a licence to host and display it as
            needed to operate the workspace, including sending text you choose to our AI provider when you
            use Edit with AI.
          </p>

          <h2>8. Limitation of liability</h2>
          <p>
            Co-Helper is provided "as is". We do not guarantee the quality, delivery, or performance of any
            one-person business or company, and we do not guarantee that recorded payments were actually made. Our
            liability is limited to the maximum extent permitted by applicable law.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these terms. You may close your account at any
            time by contacting support.
          </p>

          <h2>10. Governing law</h2>
          <p>
            These terms are governed by applicable international commercial law. Disputes shall be resolved
            through binding arbitration or courts of competent jurisdiction, unless mandatory consumer protection laws apply.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a href="mailto:legal@co-helper.com">legal@co-helper.com</a>
          </p>
        </ProseBlock>
      </ContentSection>
    </MarketingLayout>
  )
}
