-- Add "event" format to Blog platform
UPDATE public.content_platforms
SET supported_formats = '["article", "event"]'::jsonb
WHERE name = 'blog';
