import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const fixedEmail = "javexindustry@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = await req.json().catch(() => ({}));
    if (body.email !== fixedEmail) return new Response(JSON.stringify({ error: "Invalid bootstrap request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existingProfile } = await admin.from("user_profiles").select("id").eq("email", fixedEmail).maybeSingle();
    if (existingProfile) return new Response(JSON.stringify({ error: "Bootstrap already completed" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const password = crypto.randomUUID().replaceAll("-", "").slice(0, 14) + "!A9";
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email: fixedEmail, password, email_confirm: true, user_metadata: { name: "Javex Industry" } });
    if (createError || !created.user) throw new Error("Could not create account");
    const { error: profileError } = await admin.from("user_profiles").insert({ id: created.user.id, email: fixedEmail, name: "Javex Industry", role: "super_admin", active: true });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error("Could not create profile");
    }
    return new Response(JSON.stringify({ email: fixedEmail, temporaryPassword: password }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("bootstrap-super-admin failed", error);
    return new Response(JSON.stringify({ error: "Could not complete setup" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
