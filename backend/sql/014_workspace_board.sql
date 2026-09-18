-- ============================================================
-- Migration 014: Shared workspace board
-- Run after 013
-- Idempotent: safe to re-run
--
-- Adds a `waiting` inquiry status so a workspace job can sit in
-- Requested / Doing / Waiting / Done on the shared client board.
-- ============================================================

ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'waiting';
