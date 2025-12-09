-- Add payment details to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- Add payment metadata to enrollments
ALTER TABLE public.course_enrollments
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS amount_paid INTEGER,
ADD COLUMN IF NOT EXISTS currency_paid VARCHAR(3);
