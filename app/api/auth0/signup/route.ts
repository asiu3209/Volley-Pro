import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    //Obtain inputed account info
    const { email, password, name } = await request.json();

    //Make sure not empty
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email or Password is invalid" },
        { status: 400 }
      );
    }

    // Password validation (Auth0 requires strong passwords)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check environment variables
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_CLIENT_ID;

    if (!domain || !clientId) {
      console.error("Missing AUTH0_DOMAIN or AUTH0_CLIENT_ID");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Use Auth0's public signup endpoint (no Management API needed!)
    // This is the Database Connections signup endpoint
    const signupUrl = `https://${domain}/dbconnections/signup`;

    const response = await fetch(signupUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        connection: "Username-Password-Authentication",
        email: email,
        password: password,
        name: name || email.split("@")[0],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Auth0 signup error:", data);

      // Handle specific Auth0 errors
      if (data.code === "invalid_password") {
        return NextResponse.json(
          {
            error:
              "Password is too weak. Include uppercase, lowercase, numbers, and special characters.",
          },
          { status: 400 }
        );
      }

      if (data.code === "user_exists") {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      if (data.code === "invalid_signup") {
        return NextResponse.json(
          { error: "Invalid sign up. Check password strength requirements." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: data.description || data.message || "Sign-up failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully. Please sign in",
      userId: data.id,
    });
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { error: "Sign-up failed. Please try again." },
      { status: 500 }
    );
  }
}
