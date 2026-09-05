// Deletes the calling user's account and all their data.
//
// Required for Apple App Store Guideline 5.1.1(v) — an app that supports account
// creation must let the user delete the account from inside the app. The client
// cannot do this: removing an auth user needs the service-role key, which must
// never ship in the app bundle.
//
// Deploy:  supabase functions deploy delete-account
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//          (all three are injected automatically by the Supabase platform)

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Resolve the caller from their own JWT. Never trust a user id from the body:
  // that would let anyone delete anyone.
  const asCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await asCaller.auth.getUser();
  if (userError || !user) {
    return json({ error: "Invalid or expired session" }, 401);
  }

  const admin = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Delete owned rows first. ON DELETE CASCADE should cover this, but doing it
  // explicitly means the data is gone even if the FKs aren't set up that way.
  for (const table of ["workouts", "spotify_tokens"]) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) {
      return json({ error: `Failed to delete ${table}: ${error.message}` }, 500);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return json({ error: `Failed to delete account: ${deleteError.message}` }, 500);
  }

  return json({ success: true }, 200);
});
