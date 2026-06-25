
-- Super admin registry
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins: read" ON public.super_admins;
CREATE POLICY "Super admins: read" ON public.super_admins
  FOR SELECT TO authenticated USING (true);

-- Helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _uid)
$$;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon, service_role;

-- Seed original admin as super admin
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'admin@focusflow.test'
ON CONFLICT DO NOTHING;

-- user_roles policies: admins read, only super-admins write/delete and cannot touch other super-admins
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Roles: self or admin read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Roles: super admin insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND NOT public.is_super_admin(user_id));

CREATE POLICY "Roles: super admin delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) AND NOT public.is_super_admin(user_id));

-- Profile edit: admins can edit non-super-admin profiles; super-admins can edit anyone; everyone can still edit self
DROP POLICY IF EXISTS "Profiles: own update" ON public.profiles;
CREATE POLICY "Profiles: own update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (public.has_role(auth.uid(), 'admin') AND (NOT public.is_super_admin(id) OR public.is_super_admin(auth.uid())))
  )
  WITH CHECK (
    id = auth.uid()
    OR (public.has_role(auth.uid(), 'admin') AND (NOT public.is_super_admin(id) OR public.is_super_admin(auth.uid())))
  );

DROP POLICY IF EXISTS "Profiles: admin delete" ON public.profiles;
CREATE POLICY "Profiles: admin delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND NOT public.is_super_admin(id));
