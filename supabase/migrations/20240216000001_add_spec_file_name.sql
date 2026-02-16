-- Add file_name column to specs table
ALTER TABLE public.specs
ADD COLUMN file_name TEXT;

COMMENT ON COLUMN public.specs.file_name IS 'Original file name of the spec (e.g., README.md)';
