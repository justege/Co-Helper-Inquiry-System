-- ============================================================
-- Migration 008b — Run AFTER 008 has been committed
-- Migrates any legacy 'converted' inquiry rows → 'accepted'
-- ============================================================

UPDATE inquiries
SET status = 'accepted'::inquiry_status
WHERE status::text = 'converted';
