import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = authorization.replace("Bearer ", "");
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: actor } = await admin.from("user_profiles").select("role, active").eq("id", authData.user.id).maybeSingle();
    if (!actor || actor.role !== "super_admin" || !actor.active) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    if (!email || !name || !/^\S+@\S+\.\S+$/.test(email)) return new Response(JSON.stringify({ error: "Invalid details" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const password = crypto.randomUUID().replaceAll("-", "").slice(0, 14) + "!A9";
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (createError || !created.user) return new Response(JSON.stringify({ error: "Could not create admin" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { error: profileError } = await admin.from("user_profiles").insert({ id: created.user.id, email, name, role: "admin", active: true });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error("Could not create admin profile");
    }
    return new Response(JSON.stringify({ email, temporaryPassword: password }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("create-admin failed", error);
    return new Response(JSON.stringify({ error: "Could not create admin" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
