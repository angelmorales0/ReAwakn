import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {

  try {
    const { skill } = await request.json();

    if (!skill) {
      return NextResponse.json({ error: "Skill is required" }, { status: 400 });
    }

    const apiKey = process.env.HF_WRITE_TOKEN;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Hugging Face API key is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: skill,
          options: {
            wait_for_model: true,
          },
        }),
      }
    );


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Hugging Face API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();


    // For sentence-transformers, the response is an array of embeddings
    // Since we sent one input, we get one embedding back
    const embedding = data;

    return NextResponse.json({ embedding: embedding });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate embedding", details: error.message },
      { status: 500 }
    );
  }
}
