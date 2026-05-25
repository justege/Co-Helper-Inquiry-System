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
            By accessing or using OutsourceSoft, you agree to these Terms of Service. If you do not agree,
            you may not use the platform.
          </p>

          <h2>2. Platform description</h2>
          <p>
            OutsourceSoft is a B2B procurement platform that connects buyers with verified Turkish manufacturers
            and service partners. We facilitate inquiry management, offer comparison, and order tracking. We are
            not a party to transactions between buyers and partners unless explicitly stated.
          </p>

          <h2>3. Account registration</h2>
          <p>
            You must provide accurate information when creating an account. You are responsible for maintaining
            the confidentiality of your credentials and for all activity under your account.
          </p>

          <h2>4. Buyer obligations</h2>
          <ul>
            <li>Provide accurate and complete inquiry specifications</li>
            <li>Respond to partner questions in a timely manner</li>
            <li>Honour accepted offers according to agreed terms</li>
            <li>Not use the platform for unlawful or fraudulent purposes</li>
          </ul>

          <h2>5. Partner obligations</h2>
          <ul>
            <li>Maintain accurate company and capability profiles</li>
            <li>Submit honest, itemised offers within stated deadlines</li>
            <li>Fulfil accepted orders according to agreed specifications and timelines</li>
            <li>Comply with applicable export, quality, and certification requirements</li>
          </ul>

          <h2>6. Fees</h2>
          <p>
            Buyer accounts are free. Partners may be charged a success fee on accepted orders as described on
            our Pricing page. Enterprise plans are governed by separate agreements.
          </p>

          <h2>7. Intellectual property</h2>
          <p>
            The OutsourceSoft platform, branding, and software are owned by OutsourceSoft. Users retain ownership
            of content they upload but grant us a licence to use it for platform operations.
          </p>

          <h2>8. Limitation of liability</h2>
          <p>
            OutsourceSoft is provided "as is". We do not guarantee the quality, delivery, or performance of any
            partner. Our liability is limited to the maximum extent permitted by applicable law.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these terms. You may close your account at any
            time by contacting support.
          </p>

          <h2>10. Governing law</h2>
          <p>
            These terms are governed by the laws of the Republic of Turkey. Disputes shall be resolved in the
            courts of Istanbul, unless mandatory consumer protection laws apply.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a href="mailto:legal@outsourcesoft.com">legal@outsourcesoft.com</a>
          </p>
        </ProseBlock>
      </ContentSection>
    </MarketingLayout>
  )
}
