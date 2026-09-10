-- Add reply tracking to enquiries and allow staff to read them

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS reply_subject text,
  ADD COLUMN IF NOT EXISTS reply_message text,
  ADD COLUMN IF NOT EXISTS reply_price text,
  ADD COLUMN IF NOT EXISTS replied_by uuid,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sent boolean DEFAULT false;

-- Staff can read enquiries (both super_admin and admin)
DROP POLICY IF EXISTS "staff_read_enquiries" ON public.enquiries;
CREATE POLICY "staff_read_enquiries" ON public.enquiries FOR SELECT
  TO authenticated
  USING (public.is_active_staff());

-- Only super_admin can update enquiry status/reply fields directly
DROP POLICY IF EXISTS "super_admin_update_enquiries" ON public.enquiries;
CREATE POLICY "super_admin_update_enquiries" ON public.enquiries FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Allow admins to update status only (for marking as read/in-progress) via RPC
-- The actual reply + send is handled by the edge function using service role

REVOKE UPDATE ON public.enquiries FROM authenticated;
GRANT UPDATE (status) ON public.enquiries TO authenticated;
