-- ============================================================
-- Migration 012: Digital service categories & catalog
-- Run in Supabase SQL Editor after 001–011
-- Idempotent: safe to re-run
-- ============================================================

-- ── 1. Link partner services to categories ────────────────────────────────────

ALTER TABLE partner_services
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS partner_services_category_idx
  ON partner_services (category_id)
  WHERE category_id IS NOT NULL;

-- ── 2. Platform service catalog (per category) ────────────────────────────────

CREATE TABLE IF NOT EXISTS category_services (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  slug        TEXT        NOT NULL,
  description TEXT,
  is_live     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS category_services_category_idx
  ON category_services (category_id, sort_order);

-- ── 3. Seed digital service categories ────────────────────────────────────────

INSERT INTO categories (name, slug, type, description)
VALUES
  (
    'E-commerce',
    'e-commerce',
    'service',
    'Shopify, WooCommerce, headless storefronts, migrations, subscriptions, and conversion-focused store builds.'
  ),
  (
    'Full Stack Development',
    'full-stack-development',
    'service',
    'End-to-end web applications — React, Node, APIs, databases, auth, billing, and production deployment.'
  ),
  (
    'Mobile Apps',
    'mobile-apps',
    'service',
    'Native and cross-platform iOS/Android apps, from MVP prototypes through App Store launch.'
  ),
  (
    'MVP & Product Builds',
    'mvp-product-builds',
    'service',
    'Scoped SaaS MVPs, startup prototypes, and v1 product delivery with auth, admin, and core workflows.'
  ),
  (
    'Automation & Integrations',
    'automation-integrations',
    'service',
    'n8n workflows, email automation, CRM integrations, webhooks, and no-code/low-code ops pipelines.'
  ),
  (
    'SEO & Marketing',
    'seo-marketing',
    'service',
    'Technical SEO, paid search, analytics, and growth strategy for measurable traffic and conversions.'
  ),
  (
    'Social Media',
    'social-media',
    'service',
    'Content creation, community management, and paid social campaigns across major platforms.'
  ),
  (
    'Design & Branding',
    'design-branding',
    'service',
    'Brand identity, UI/UX design, marketing creative, and design systems.'
  ),
  (
    'Content & Email',
    'content-email',
    'service',
    'Copywriting, lifecycle email, newsletters, landing pages, and conversion-focused content.'
  ),
  (
    'Development',
    'development',
    'service',
    'Web apps, mobile, Chrome extensions, APIs, and custom software — see also Full Stack Development and Mobile Apps.'
  ),
  (
    'Content',
    'content',
    'service',
    'Copywriting and email campaigns — see Content & Email for the full catalog.'
  )
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  type        = EXCLUDED.type,
  description = EXCLUDED.description;

-- ── 4. Seed catalog services per category ─────────────────────────────────────

WITH seed_services (cat_slug, name, slug, description, is_live, sort_order) AS (
  VALUES
    -- E-commerce
    ('e-commerce', 'Shopify Store Setup',              'shopify-store-setup',              'Launch a production-ready Shopify store with theme, apps, checkout, and core apps.', TRUE,  1),
    ('e-commerce', 'Shopify Plus Implementation',      'shopify-plus-implementation',      'Enterprise Shopify Plus setup — multi-store, B2B, wholesale, and advanced checkout.', TRUE,  2),
    ('e-commerce', 'Custom Theme Development',         'custom-theme-development',         'Bespoke Shopify or headless storefront themes aligned to your brand and UX.', TRUE,  3),
    ('e-commerce', 'WooCommerce Store Build',          'woocommerce-store-build',          'WordPress + WooCommerce setup with payments, shipping, and product catalog.', TRUE,  4),
    ('e-commerce', 'E-commerce Migration',             'e-commerce-migration',             'Migrate products, customers, orders, and SEO from Magento, WooCommerce, or custom stacks.', TRUE,  5),
    ('e-commerce', 'Headless Commerce Setup',          'headless-commerce-setup',          'Shopify Hydrogen, custom storefronts, and API-driven commerce experiences.', TRUE,  6),
    ('e-commerce', 'Subscription & Recurring Billing', 'subscription-recurring-billing',   'Recharge, Bold, or native subscriptions — plans, dunning, and retention flows.', TRUE,  7),
    ('e-commerce', 'Product Catalog & Merchandising',  'product-catalog-merchandising',    'Bulk import, variants, collections, bundles, and merchandising rules.', FALSE, 8),
    ('e-commerce', 'Payment, Tax & Shipping Setup',  'payment-tax-shipping-setup',       'Gateways, tax engines, shipping zones, and fulfillment integrations.', FALSE, 9),
    ('e-commerce', 'Store CRO & Performance',          'store-cro-performance',            'Checkout optimization, speed audits, and conversion improvements for existing stores.', FALSE, 10),

    -- Full Stack Development
    ('full-stack-development', 'Full Stack Web Application',     'full-stack-web-application',     'React/Next.js + Node/Nest/Express builds from architecture through production launch.', TRUE,  1),
    ('full-stack-development', 'SaaS Platform Build',          'saas-platform-build',            'Multi-tenant SaaS with auth, billing, admin dashboards, and role-based access.', TRUE,  2),
    ('full-stack-development', 'REST & GraphQL API Development', 'rest-graphql-api-development',   'Scalable APIs, documentation, versioning, and third-party integrations.', TRUE,  3),
    ('full-stack-development', 'Chrome Extension Development',   'chrome-extension-development',   'Manifest V3 extensions — popup UI, content scripts, background workers, and Chrome Web Store publish.', TRUE,  4),
    ('full-stack-development', 'Admin Dashboard & Internal Tools','admin-dashboard-internal-tools', 'Custom back-office panels, reporting, and ops tooling for your team.', TRUE,  5),
    ('full-stack-development', 'Database Design & Backend',      'database-design-backend',        'Postgres/Supabase schema design, migrations, RLS, and performance tuning.', TRUE,  6),
    ('full-stack-development', 'WordPress & Headless CMS',       'wordpress-headless-cms',         'Custom themes, plugins, and headless WordPress or Contentful/Sanity setups.', FALSE, 7),
    ('full-stack-development', 'Legacy App Modernization',       'legacy-app-modernization',       'Refactor monoliths, migrate stacks, and improve reliability without a full rewrite.', FALSE, 8),
    ('full-stack-development', 'DevOps & Cloud Deployment',      'devops-cloud-deployment',        'Vercel, AWS, Docker, CI/CD pipelines, and production monitoring setup.', FALSE, 9),

    -- Mobile Apps
    ('mobile-apps', 'Cross-Platform App (React Native)',  'cross-platform-react-native',  'Single codebase for iOS and Android — navigation, auth, push, and store-ready builds.', TRUE,  1),
    ('mobile-apps', 'Native iOS App Development',           'native-ios-app-development',   'Swift/SwiftUI apps with App Store submission and TestFlight distribution.', TRUE,  2),
    ('mobile-apps', 'Native Android App Development',       'native-android-app-development','Kotlin/Jetpack Compose apps with Play Store release support.', TRUE,  3),
    ('mobile-apps', 'Mobile MVP Prototype',                 'mobile-mvp-prototype',         'Scoped v1 app with core flows, auth, and analytics — ship to testers in weeks.', TRUE,  4),
    ('mobile-apps', 'App Store Optimization & Launch',      'app-store-optimization-launch', 'Store listings, screenshots, ASO, and submission handling.', FALSE, 5),
    ('mobile-apps', 'Mobile Backend & Push Notifications',  'mobile-backend-push',          'Firebase, auth, real-time sync, and notification infrastructure.', FALSE, 6),

    -- MVP & Product Builds
    ('mvp-product-builds', 'SaaS MVP Build',                   'saas-mvp-build',                   'Auth, billing stub, admin panel, and one core workflow — ready for early customers.', TRUE,  1),
    ('mvp-product-builds', 'Startup Prototype (4-8 weeks)',    'startup-prototype',                'Clickable prototype or functional v1 to validate with users and investors.', TRUE,  2),
    ('mvp-product-builds', 'Marketplace MVP',                  'marketplace-mvp',                  'Two-sided marketplace foundations — listings, matching, messaging, and payments.', TRUE,  3),
    ('mvp-product-builds', 'Internal Tool MVP',                'internal-tool-mvp',                'Replace spreadsheets with a focused internal app for one team workflow.', TRUE,  4),
    ('mvp-product-builds', 'AI-Assisted Product MVP',        'ai-assisted-product-mvp',          'LLM features, chat interfaces, and RAG pipelines integrated into a shippable v1.', TRUE,  5),
    ('mvp-product-builds', 'Post-MVP Scale-Up',                'post-mvp-scale-up',                'Hardening, testing, performance, and feature expansion after initial launch.', FALSE, 6),

    -- Automation & Integrations
    ('automation-integrations', 'n8n Workflow Automation',          'n8n-workflow-automation',          'Self-hosted or cloud n8n — multi-step workflows, webhooks, and scheduled jobs.', TRUE,  1),
    ('automation-integrations', 'Email Automation Setup',           'email-automation-setup',           'Klaviyo, Mailchimp, HubSpot, or Customer.io flows — welcome, cart, win-back, lifecycle.', TRUE,  2),
    ('automation-integrations', 'CRM & Sales Pipeline Integration', 'crm-sales-pipeline-integration',   'HubSpot, Pipedrive, Salesforce sync with your product, forms, and billing.', TRUE,  3),
    ('automation-integrations', 'Zapier / Make.com Workflows',      'zapier-make-workflows',            'No-code automations connecting SaaS tools, sheets, Slack, and support systems.', TRUE,  4),
    ('automation-integrations', 'Webhook & API Integrations',       'webhook-api-integrations',         'Connect platforms via REST, GraphQL, OAuth, and event-driven pipelines.', TRUE,  5),
    ('automation-integrations', 'Slack & Notion Automations',       'slack-notion-automations',         'Alerts, brief intake, project updates, and knowledge-base sync.', FALSE, 6),
    ('automation-integrations', 'E-commerce Ops Automation',        'ecommerce-ops-automation',         'Order routing, inventory sync, fulfillment alerts, and reporting automations.', TRUE,  7),
    ('automation-integrations', 'Data Sync & Reporting Pipelines',  'data-sync-reporting-pipelines',    'ETL to warehouses, scheduled reports, and dashboard feeds from multiple sources.', FALSE, 8),

    -- SEO & Marketing
    ('seo-marketing', 'Technical SEO Audit',             'technical-seo-audit',             'Crawl analysis, Core Web Vitals, indexation, and prioritized fix roadmap.', TRUE,  1),
    ('seo-marketing', 'SEO Strategy Package',            'seo-strategy-package',            'Keyword research, content plan, and on-page optimization playbook.', TRUE,  2),
    ('seo-marketing', 'Google Ads Setup',                'google-ads-setup',                'Campaign structure, conversion tracking, and initial ad creative.', TRUE,  3),
    ('seo-marketing', 'Google Analytics 4 & GTM Setup',  'ga4-gtm-setup',                   'GA4, Tag Manager, conversion events, and server-side tracking.', TRUE,  4),
    ('seo-marketing', 'Conversion Rate Optimization',      'conversion-rate-optimization',    'Landing page tests, funnel analysis, and UX improvements.', FALSE, 5),
    ('seo-marketing', 'Meta & LinkedIn Ads Setup',       'meta-linkedin-ads-setup',         'Paid social campaigns with pixel/CAPI setup and creative testing.', FALSE, 6),

    -- Social Media
    ('social-media', 'Social Starter Plan',              'social-starter-plan',             'Channel setup, content calendar, and baseline posting cadence.', FALSE, 1),
    ('social-media', 'Content Creation Bundle',          'content-creation-bundle',         'Short-form video, static posts, and platform-native creative.', FALSE, 2),
    ('social-media', 'Community Management',             'community-management',             'Inbox moderation, engagement, and brand voice consistency.', FALSE, 3),
    ('social-media', 'Influencer Campaign Setup',        'influencer-campaign-setup',        'Creator sourcing, briefs, contracts, and performance tracking.', FALSE, 4),
    ('social-media', 'Social Media Strategy',            'social-media-strategy',            'Audience research, positioning, and quarterly growth roadmap.', FALSE, 5),

    -- Design & Branding
    ('design-branding', 'Brand Identity',                'brand-identity',                  'Logo, color system, typography, and brand guidelines.', FALSE, 1),
    ('design-branding', 'UI/UX Design',                  'ui-ux-design',                    'Wireframes, high-fidelity UI, and interactive prototypes.', FALSE, 2),
    ('design-branding', 'Marketing Creative',            'marketing-creative',              'Ad creatives, social assets, and campaign visuals.', FALSE, 3),
    ('design-branding', 'SaaS Product UI Design',        'saas-product-ui-design',          'Dashboard, onboarding, and settings flows for web and mobile apps.', TRUE,  4),
    ('design-branding', 'Design System',                 'design-system',                   'Component library and documentation for product teams.', FALSE, 5),

    -- Content & Email
    ('content-email', 'Email Marketing Campaigns',        'email-marketing-campaigns',       'Newsletters, promos, and one-off campaigns with design and copy.', TRUE,  1),
    ('content-email', 'Lifecycle & Drip Sequences',       'lifecycle-drip-sequences',        'Welcome, nurture, onboarding, and re-engagement email flows.', TRUE,  2),
    ('content-email', 'Copywriting',                      'copywriting',                     'Website, product, and sales copy tuned for conversion.', FALSE, 3),
    ('content-email', 'Landing Page Copy & Structure',    'landing-page-copy-structure',     'High-converting landing pages for ads, launches, and lead gen.', TRUE,  4),
    ('content-email', 'Blog & SEO Content Package',       'blog-seo-content-package',        'Editorial calendar and SEO-optimized articles.', FALSE, 5),
    ('content-email', 'Video Script Writing',             'video-script-writing',            'Scripts for ads, explainers, and social video.', FALSE, 6),

    -- Legacy category slugs (kept for existing DBs that seeded migration v1)
    ('development', 'Full Stack Web App',                 'full-stack-web-app',              'React/Node product builds from MVP through production launch.', TRUE,  1),
    ('development', 'Mobile App (React Native)',          'mobile-app-react-native',         'Cross-platform iOS and Android apps with shared codebase.', TRUE,  2),
    ('development', 'Chrome Extension Build',             'chrome-extension-build',          'Browser extensions for Chrome with popup, content scripts, and store publish.', TRUE,  3),
    ('development', 'API & Backend Development',        'api-backend-development',         'REST/GraphQL APIs, webhooks, and backend services.', TRUE,  4),
    ('development', 'SaaS MVP Build',                     'saas-mvp-build-legacy',           'Scoped MVP delivery with auth, billing, and admin foundations.', TRUE,  5),
    ('content', 'Email Campaigns',                        'email-campaigns',                 'Newsletter flows, lifecycle emails, and automation sequences.', TRUE,  1),
    ('content', 'Copywriting',                          'copywriting-legacy',              'Website, product, and sales copy tuned for conversion.', FALSE, 2),
    ('content', 'Landing Pages',                        'landing-pages',                   'High-converting landing page copy and structure.', FALSE, 3)
)
INSERT INTO category_services (category_id, name, slug, description, is_live, sort_order)
SELECT c.id, s.name, s.slug, s.description, s.is_live, s.sort_order
FROM seed_services s
INNER JOIN categories c ON c.slug = s.cat_slug
ON CONFLICT (category_id, slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  is_live     = EXCLUDED.is_live,
  sort_order  = EXCLUDED.sort_order;
