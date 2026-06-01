import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name ?? email.split("@")[0],
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const user = data.user;

  // 🔥 CREATE PROFILE AUTOMATICALLY
  if (user) {
    await supabase.from("profiles").insert({
      id: user.id,
      full_name: name ?? email.split("@")[0],
      username: email.split("@")[0],
      position: "Unknown",
      skill_level: 5,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Account created successfully",
    userId: user?.id,
  });
}