import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero, ProseBlock } from "@/components/marketing/MarketingUI"

export default function TermsPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Legal"
        title="Terms of Service"
        subtitle="Last updated: May 2026"
      />

      <ContentSection narrow>
        <ProseBlock>
          <h2>1. Agreement</h2>
          <p>
            By accessing or using Co-Helper, you agree to these Terms of Service. If you do not agree,
            you may not use the platform.
          </p>

          <h2>2. Platform description</h2>
          <p>
            Co-Helper is a digital services outsourcing platform that connects clients with verified
            specialists worldwide. Each project is assigned a dedicated project manager who coordinates
            delivery. We facilitate project briefs, milestone tracking, and deliverable management. We are
            not a party to transactions between clients and specialists unless explicitly stated.
          </p>

          <h2>3. Account registration</h2>
          <p>
            You must provide accurate information when creating an account. You are responsible for maintaining
            the confidentiality of your credentials and for all activity under your account.
          </p>

          <h2>4. Client obligations</h2>
          <ul>
            <li>Provide accurate and complete project specifications</li>
            <li>Respond to your project manager in a timely manner</li>
            <li>Honour accepted proposals according to agreed terms</li>
            <li>Not use the platform for unlawful or fraudulent purposes</li>
          </ul>

          <h2>5. Specialist obligations</h2>
          <ul>
            <li>Maintain accurate profiles and capability listings</li>
            <li>Deliver work according to agreed specifications and timelines</li>
            <li>Communicate through assigned project managers as required</li>
            <li>Maintain professional standards and confidentiality</li>
          </ul>

          <h2>6. Fees</h2>
          <p>
            Client accounts are free. Specialists may be charged a success fee on completed projects as described on
            our Pricing page. Enterprise plans are governed by separate agreements.
          </p>

          <h2>7. Intellectual property</h2>
          <p>
            The Co-Helper platform, branding, and software are owned by Co-Helper. Users retain ownership
            of content they upload but grant us a licence to use it for platform operations.
          </p>

          <h2>8. Limitation of liability</h2>
          <p>
            Co-Helper is provided "as is". We do not guarantee the quality, delivery, or performance of any
            specialist. Our liability is limited to the maximum extent permitted by applicable law.
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
