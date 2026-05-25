-- ============================================================
-- Migration 010: Remove projects entity (inquiry-only workflow)
-- Run in Supabase SQL Editor after 001–009
-- Idempotent: safe to re-run
-- ============================================================

DROP TABLE IF EXISTS projects CASCADE;
DROP TYPE IF EXISTS project_status;
