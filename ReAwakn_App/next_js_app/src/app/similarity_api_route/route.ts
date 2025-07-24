import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

interface SimilarityRequest {
  loggedInUserId?: string;
  targetUserId?: string;
  action?: "similarity" | "refresh";
}

interface SimilarityResponse {
  similarity?: number;
  error?: string;
}

function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    const python = spawn("/usr/local/bin/python3", [scriptPath, ...args], {
      cwd: process.cwd(),
      env: env,
    });

    let output = "";
    let errorOutput = "";

    python.stdout?.on("data", (data: Buffer) => {
      const dataStr = data.toString();
      output += dataStr;
    });

    python.stderr.on("data", (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
    });

    python.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new Error(`Python script failed with code ${code}: ${errorOutput}`)
        );
      }
    });

    python.on("error", (error) => {
      reject(error);
    });
  });
}

function getPythonScriptPath(): string {
  return path.join(
    process.cwd(),
    "src",
    "app",
    "user_similarity_algorithm",
    "similarity_api.py"
  );
}

async function calculateSimilarity(
  userId1: string,
  userId2: string,
  isGet: boolean = false
): Promise<{ similarity_score?: number; error?: string }> {
  try {
    const output = await runPythonScript(getPythonScriptPath(), [
      "similarity",
      userId1,
      userId2,
    ]);

    const trimmedOutput = output.trim();
    if (!trimmedOutput) {
      console.error("Empty response from similarity calculation");
      return { similarity_score: 0, error: "Empty response from calculation" };
    }

    const resultMatch = trimmedOutput.match(
      /RESULT_START\s*([\d.]+)\s*RESULT_END/
    );

    if (resultMatch && resultMatch[1]) {
      const similarity_score = parseFloat(resultMatch[1]);
      console.log(
        `Extracted similarity score from markers: ${similarity_score}`
      );

      if (!isNaN(similarity_score)) {
        return { similarity_score };
      }
    }

    const lines = trimmedOutput.split("\n");
    const lastLine = lines[lines.length - 1].trim();

    const similarity_score = parseFloat(lastLine);

    if (isNaN(similarity_score)) {
      throw new Error("Invalid similarity score: not a number");
    }

    if (similarity_score < 0 || similarity_score > 1) {
      throw new Error(
        `Similarity score out of expected range: ${similarity_score}`
      );
    }

    return { similarity_score: similarity_score };
  } catch (error) {
    const prefix = isGet ? "GET " : "";
    alert(error);
    return {
      error: `Failed to calculate similarity: ${
        (error as Error).message || "Unknown error"
      }`,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SimilarityRequest = await request.json();
    const { loggedInUserId, targetUserId, action = "similarity" } = body;

    if (action === "refresh") {
      try {
        await runPythonScript(getPythonScriptPath(), ["refresh"]);
        return NextResponse.json({
          success: true,
          message: "Similarity data refreshed successfully",
        });
      } catch (error) {
        return NextResponse.json(
          { error: "Failed to refresh similarity data" },
          { status: 500 }
        );
      }
    }
    if (!loggedInUserId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing required user IDs for similarity calculation" },
        { status: 400 }
      );
    }

    const similarity = await calculateSimilarity(loggedInUserId, targetUserId);
    let result: SimilarityResponse = {};

    if (similarity.similarity_score !== undefined) {
      result.similarity = similarity.similarity_score;
    } else if (similarity.error) {
      result.error = similarity.error;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const targetUserId = searchParams.get("targetUserId");

  if (!userId || !targetUserId) {
    return NextResponse.json(
      { error: "Missing userId or targetUserId parameter" },
      { status: 400 }
    );
  }

  try {
    const similarityResult = await calculateSimilarity(userId, targetUserId);

    let result: SimilarityResponse = {};
    if (similarityResult.similarity_score !== undefined) {
      result.similarity = similarityResult.similarity_score;
    } else if (similarityResult.error) {
      result.error = similarityResult.error;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
