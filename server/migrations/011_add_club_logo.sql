-- Add logo_url column to clubs table to support base64 images or remote URLs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;
