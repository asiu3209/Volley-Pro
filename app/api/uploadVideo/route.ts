import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    //File error checking
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }
    //Ensures proper type of file data is being sent to backend
    const forwardData = new FormData();
    forwardData.append("file", file);
    //Fast API port and /videos prefix from main.py
    //upload is posted router route
    const response = await fetch("http://backend:8000/videos/upload", {
      method: "POST",
      body: forwardData,
    });

    const data = await response.json();
    console.log("Upload has been complete in NextJs API route");
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
