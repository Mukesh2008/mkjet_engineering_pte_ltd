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
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("user_profiles").select("role, active, name").eq("id", userData.user.id).maybeSingle();
    if (!profile || !profile.active || !["super_admin", "admin"].includes(profile.role)) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const enquiryId = String(body.enquiry_id || "");
    const replyMessage = String(body.reply_message || "").trim();
    const replyPrice = String(body.reply_price || "").trim();
    const sendEmail = body.send_email !== false;
    const sendSms = body.send_sms !== false;

    if (!enquiryId || !replyMessage) return json({ error: "Enquiry ID and reply message are required" }, 400);

    const { data: enquiry, error: fetchError } = await admin.from("enquiries").select("*").eq("id", enquiryId).maybeSingle();
    if (fetchError || !enquiry) return json({ error: "Enquiry not found" }, 404);

    const subject = `Re: Your enquiry with MK Jet Plumbing Services${enquiry.service ? ` — ${enquiry.service}` : ""}`;
    let emailResult = { sent: false, error: "Email not configured" };
    let smsResult = { sent: false, error: "SMS not configured" };

    if (sendEmail && enquiry.email) {
      try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          const emailBody = buildEmailBody(enquiry, replyMessage, replyPrice, profile.name);
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: Deno.env.get("FROM_EMAIL") || "MK Jet Plumbing <replies@mkjetengineering.com>",
              to: enquiry.email,
              subject,
              html: emailBody,
            }),
          });
          emailResult = res.ok ? { sent: true, error: "" } : { sent: false, error: `Resend error ${res.status}` };
        }
      } catch (e) { emailResult = { sent: false, error: String(e) }; }
    }

    if (sendSms && enquiry.phone) {
      try {
        const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
        const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
        const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER");
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) {
          const smsText = `MK Jet Plumbing: ${replyMessage}${replyPrice ? ` | Quotation: ${replyPrice}` : ""} — ${profile.name}`;
          const params = new URLSearchParams({ From: TWILIO_FROM, To: enquiry.phone, Body: smsText.slice(0, 1600) });
          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
            method: "POST",
            headers: { Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`), "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          });
          smsResult = res.ok ? { sent: true, error: "" } : { sent: false, error: `Twilio error ${res.status}` };
        }
      } catch (e) { smsResult = { sent: false, error: String(e) }; }
    }

    const { error: updateError } = await admin.from("enquiries").update({
      reply_subject: subject,
      reply_message: replyMessage,
      reply_price: replyPrice || null,
      replied_by: userData.user.id,
      replied_at: new Date().toISOString(),
      email_sent: emailResult.sent,
      sms_sent: smsResult.sent,
      status: "replied",
    }).eq("id", enquiryId);
    if (updateError) return json({ error: "Could not save reply" }, 500);

    return json({ success: true, email: emailResult, sms: smsResult });
  } catch (error) {
    console.error("reply-enquiry failed", error);
    return json({ error: "Could not send reply" }, 500);
  }

  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function buildEmailBody(enquiry: { name: string; service: string | null; message: string | null }, replyMessage: string, replyPrice: string, adminName: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f7f9fc;">
  <div style="background:#fff;border:1px solid #e3eaf2;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(120deg,#1565c0,#0891b2);padding:28px 32px;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:600;">MK Jet Plumbing Services</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">Your enquiry has been answered</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#0f1f38;">Hi ${enquiry.name || "there"},</p>
      <p style="font-size:15px;color:#5a6b85;line-height:1.6;margin:16px 0;">Thank you for reaching out to MK Jet Plumbing Services${enquiry.service ? ` regarding <strong>${enquiry.service}</strong>` : ""}. Here is our response:</p>
      <div style="background:#f7f9fc;border:1px solid #e3eaf2;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="font-size:15px;color:#0f1f38;line-height:1.6;margin:0;white-space:pre-wrap;">${replyMessage}</p>
      </div>
      ${replyPrice ? `<div style="background:#e0f7fa;border:1px solid #a8e8e0;border-radius:12px;padding:16px 20px;margin:20px 0;"><p style="margin:0;font-size:14px;color:#0891b2;font-weight:600;">Quotation: ${replyPrice}</p></div>` : ""}
      <p style="font-size:14px;color:#5a6b85;line-height:1.6;">If you have any further questions, feel free to reply to this email or call us at +65 6298 8808.</p>
      <p style="font-size:14px;color:#5a6b85;margin-top:24px;">Best regards,<br><strong>${adminName}</strong><br>MK Jet Plumbing Services</p>
    </div>
    <div style="background:#0b1b34;padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9fb0c6;">Blk 640, #01-68, Rowell Road, Singapore 200640 · +65 6298 8808</p>
    </div>
  </div></body></html>`;
}
