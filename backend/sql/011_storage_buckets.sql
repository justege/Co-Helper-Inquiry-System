-- ============================================================
-- Migration 011: Supabase Storage buckets for document uploads
-- Run in Supabase SQL Editor if buckets are missing
-- Idempotent: safe to re-run
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('inquiry-documents', 'inquiry-documents', false, 52428800),
  ('partner-documents', 'partner-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;
