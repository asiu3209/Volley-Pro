import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

console.log("=== Testing Auth0 Setup for Expense Tracker ===\n");

// Test 1: Check environment variables
console.log("Test 1: Environment Variables");
const required = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_AUDIENCE",
];

let allPresent = true;
required.forEach((variable) => {
  if (process.env[variable]) {
    console.log(`${variable} is set`);
  } else {
    console.log(`${variable} is MISSING`);
    allPresent = false;
  }
});

if (!allPresent) {
  console.log("\n Some environment variables are missing!");
  process.exit(1);
}

// Test 2: Token exchange (what your app actually uses)
console.log("\nTest 2: Access Token Generation");
const tokenUrl = `https://${process.env.AUTH0_DOMAIN}/oauth/token`;

try {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Successfully obtained access token");
    console.log(`Token type: ${data.token_type}`);
    console.log(`Expires in: ${data.expires_in} seconds`);
    console.log(`Token length: ${data.access_token.length} characters`);
  } else {
    const error = await response.json();
    console.log("Token request failed:");
    console.log(JSON.stringify(error, null, 2));
    console.log("\n Token generation failed");

    if (error.error === "access_denied") {
      console.log(
        "\n Common fix: Make sure you authorized your app in Step 9!"
      );
      console.log(
        "   Go to: Auth0 Dashboard → APIs → Your API → Machine to Machine Applications"
      );
      console.log("   Toggle your application to ON (Authorized)");
    }

    process.exit(1);
  }
} catch (error) {
  console.log(" Network error:", error.message);
  process.exit(1);
}

// Test 3: JWT Secret
console.log("\nTest 3: JWT Secret for Token Signing");
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
  console.log(
    `JWT_SECRET is set (${process.env.JWT_SECRET.length} characters)`
  );
} else {
  console.log("JWT_SECRET is missing or too short (needs 32+ characters)");
  console.log("   Generate one with: openssl rand -base64 32");
}

// Test 4: NextAuth Configuration
console.log("\nTest 4: NextAuth Configuration");
if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32) {
  console.log(
    `NEXTAUTH_SECRET is set (${process.env.NEXTAUTH_SECRET.length} characters)`
  );
} else {
  console.log("NEXTAUTH_SECRET is missing or too short (needs 32+ characters)");
  console.log("   Generate one with: openssl rand -base64 32");
}

if (process.env.NEXTAUTH_URL) {
  console.log(`NEXTAUTH_URL is set: ${process.env.NEXTAUTH_URL}`);
} else {
  console.log("NEXTAUTH_URL is not set");
  console.log("   Should be: http://localhost:3000");
}

// Summary
console.log("\n=== Summary ===");
console.log("Auth0 configuration is correct!");
console.log("Your app can authenticate with Auth0");
console.log("Ready to implement sign-up and sign-in\n");

console.log("Next steps:");
console.log("1. Create sign-up API route (users will register via Auth0)");
console.log("2. Create sign-in API route (users will login and get tokens)");
console.log("3. Implement JWT verification in API routes\n");
