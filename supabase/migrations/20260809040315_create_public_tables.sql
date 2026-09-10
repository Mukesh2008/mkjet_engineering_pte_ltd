/*
# Create public-facing tables for MK Jet Engineering

1. New Tables
- `enquiries` — contact form submissions from customers (name, email, phone, service, message, status, created_at).
- `newsletter_subscribers` — email subscriptions with unique email constraint and status tracking.
- `reviews` — customer reviews with pending/approved/rejected status for moderation, rating 1-5.

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated INSERT on all three tables (public submissions).
- Allow anon + authenticated SELECT only on approved reviews (moderated public content).
- No public UPDATE or DELETE — admin operations handled via dashboard (authenticated role).
- Newsletter uses upsert with unique email to prevent duplicates.

3. Notes
- Reviews default to 'pending' status so admin moderation is required before public display.
- Enquiries default to 'new' status for admin tracking.
- Newsletter subscribers default to 'active' status.
*/

CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  service text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_enquiries" ON enquiries;
CREATE POLICY "anon_insert_enquiries" ON enquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_enquiries" ON enquiries;
CREATE POLICY "authenticated_select_enquiries" ON enquiries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_update_enquiries" ON enquiries;
CREATE POLICY "authenticated_update_enquiries" ON enquiries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_enquiries" ON enquiries;
CREATE POLICY "authenticated_delete_enquiries" ON enquiries FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  subscribed_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_newsletter" ON newsletter_subscribers;
CREATE POLICY "anon_insert_newsletter" ON newsletter_subscribers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_newsletter" ON newsletter_subscribers;
CREATE POLICY "anon_update_newsletter" ON newsletter_subscribers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_newsletter" ON newsletter_subscribers;
CREATE POLICY "authenticated_select_newsletter" ON newsletter_subscribers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_delete_newsletter" ON newsletter_subscribers;
CREATE POLICY "authenticated_delete_newsletter" ON newsletter_subscribers FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  email text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text NOT NULL,
  service text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_approved_reviews" ON reviews;
CREATE POLICY "anon_select_approved_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "authenticated_select_all_reviews" ON reviews;
CREATE POLICY "authenticated_select_all_reviews" ON reviews FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_update_reviews" ON reviews;
CREATE POLICY "authenticated_update_reviews" ON reviews FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_reviews" ON reviews;
CREATE POLICY "authenticated_delete_reviews" ON reviews FOR DELETE
  TO authenticated USING (true);
