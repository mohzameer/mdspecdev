-- Update progress constraint to 0-100
ALTER TABLE specs DROP CONSTRAINT specs_progress_check;
ALTER TABLE specs ADD CONSTRAINT specs_progress_check CHECK (progress >= 0 AND progress <= 100);
