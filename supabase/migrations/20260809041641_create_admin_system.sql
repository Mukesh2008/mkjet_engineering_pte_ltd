/*
# Create the MK Jet Engineering admin system

1. New Tables
- `user_profiles` — one profile per Supabase Auth account, storing display name, role, and active status.
- `tasks` — operational jobs with customer, service, priority, due date, assigned admin, and status.
- `notifications` — private in-app alerts for authenticated staff.

2. Security
- Enable RLS on every table.
- Profiles are readable only by authenticated staff; users may update only their own display name.
- Tasks are visible to super admins in full and to admins only when assigned to them.
- Task creation and assignment changes are restricted to super admins through a checked function.
- Admins may only move their own assigned tasks to In Progress or Completed through a checked function.
- Notifications are visible and writable only for their recipient.
- Role and active status are never client-writable.

3. Important Notes
- `user_profiles.id` matches `auth.users.id`.
- The first Super Admin is created separately through the protected bootstrap edge function.
- All security-sensitive functions derive the caller from `auth.uid()` and use a fixed search path.
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  customer_name text NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  service_type text NOT NULL,
  location text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;

DROP POLICY IF EXISTS "staff_read_profiles" ON user_profiles;
CREATE POLICY "staff_read_profiles" ON user_profiles FOR SELECT TO authenticated
  USING (public.is_active_staff());
DROP POLICY IF EXISTS "staff_update_own_profile" ON user_profiles;
CREATE POLICY "staff_update_own_profile" ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.is_active_staff())
  WITH CHECK (id = auth.uid() AND public.is_active_staff());

DROP POLICY IF EXISTS "staff_read_tasks" ON tasks;
CREATE POLICY "staff_read_tasks" ON tasks FOR SELECT TO authenticated
  USING (public.is_super_admin() OR (assigned_to = auth.uid() AND public.is_active_staff()));
DROP POLICY IF EXISTS "super_admin_insert_tasks" ON tasks;
CREATE POLICY "super_admin_insert_tasks" ON tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() AND created_by = auth.uid());
DROP POLICY IF EXISTS "super_admin_update_tasks" ON tasks;
CREATE POLICY "super_admin_update_tasks" ON tasks FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
DROP POLICY IF EXISTS "super_admin_delete_tasks" ON tasks;
CREATE POLICY "super_admin_delete_tasks" ON tasks FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "staff_read_notifications" ON notifications;
CREATE POLICY "staff_read_notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_active_staff());
DROP POLICY IF EXISTS "staff_update_notifications" ON notifications;
CREATE POLICY "staff_update_notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_active_staff())
  WITH CHECK (user_id = auth.uid() AND public.is_active_staff());
DROP POLICY IF EXISTS "super_admin_insert_notifications" ON notifications;
CREATE POLICY "super_admin_insert_notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
DROP POLICY IF EXISTS "staff_delete_notifications" ON notifications;
CREATE POLICY "staff_delete_notifications" ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_active_staff());

REVOKE INSERT, UPDATE, DELETE ON user_profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON notifications FROM authenticated;
GRANT UPDATE (name) ON user_profiles TO authenticated;
GRANT UPDATE (read) ON notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.update_assigned_task_status(p_task_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid task status';
  END IF;
  UPDATE public.tasks
  SET status = p_status, updated_at = now()
  WHERE id = p_task_id AND assigned_to = auth.uid() AND status IN ('pending', 'assigned', 'in_progress');
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_assigned_task_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_assigned_task_status(uuid, text) TO authenticated;
