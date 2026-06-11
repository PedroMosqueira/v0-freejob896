import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUser(email) {
  console.log(`\n[DEBUG] Checking user with email: ${email}\n`);

  // Query users table
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, is_professional, phone_verified, free_interests_remaining");

  if (usersError) {
    console.error("Error querying users:", usersError);
    process.exit(1);
  }

  console.log(`Total users in database: ${users.length}\n`);

  // Find user by email
  const user = users.find((u) => u.email === email);

  if (!user) {
    console.log(`❌ User NOT FOUND with email: ${email}`);
    console.log("\nAll users in database:");
    users.forEach((u) => {
      console.log(`  - ${u.email}`);
    });
    process.exit(1);
  }

  console.log("✅ User FOUND:");
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  is_professional: ${user.is_professional}`);
  console.log(`  phone_verified: ${user.phone_verified}`);
  console.log(`  free_interests_remaining: ${user.free_interests_remaining}`);

  // Check subscription
  const { data: subscriptions, error: subError } = await supabase
    .from("user_subscriptions")
    .select("id, plan_id, status, user_id")
    .eq("user_id", user.id);

  if (subError) {
    console.error("\nError querying subscriptions:", subError);
  } else {
    console.log(`\nSubscriptions for this user: ${subscriptions.length}`);
    subscriptions.forEach((sub) => {
      console.log(`  - Plan: ${sub.plan_id}, Status: ${sub.status}`);
    });
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error("Usage: node debug-user.mjs <email>");
  process.exit(1);
}

debugUser(email).catch(console.error);
