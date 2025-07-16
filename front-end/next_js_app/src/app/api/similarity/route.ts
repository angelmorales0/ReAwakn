import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

interface SimilarityRequest {
  loggedInUserId: string;
  targetUserId: string;
  action: "similarity" | "compatible_users" | "detailed_compatibility";
  topN?: number;
}

interface SimilarityResponse {
  similarity?: number;
  similarUsers?: Array<{ userId: string; score: number }>;
  compatibility?: {
    overall_similarity: number;
    feature_breakdown: Record<string, number>;
  };
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

    python.stdout.on("data", (data) => {
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

export async function POST(request: NextRequest) {
  try {
    const body: SimilarityRequest = await request.json();
    const { loggedInUserId, targetUserId, action, topN = 10 } = body;

    if (!loggedInUserId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing required user IDs" },
        { status: 400 }
      );
    }

    // Path to the Python similarity service
    const pythonScriptPath = path.join(
      process.cwd(),
      "src",
      "app",
      "similarity_api.py"
    );

    let result: SimilarityResponse = {};

    switch (action) {
      case "similarity":
        try {
          const output = await runPythonScript(pythonScriptPath, [
            "similarity",
            loggedInUserId,
            targetUserId,
          ]);

          const similarity = parseFloat(output.trim());

          result.similarity = similarity;
        } catch (error) {
          result.error = "Failed to calculate similarity";
        }
        break;

      case "compatible_users":
        try {
          const output = await runPythonScript(pythonScriptPath, [
            "similar_users",
            loggedInUserId,
            topN.toString(),
          ]);
          const similarUsers = JSON.parse(output.trim());
          result.similarUsers = similarUsers.map((item: [string, number]) => ({
            userId: item[0],
            score: item[1],
          }));
        } catch (error) {
          result.error = "Failed to find similar users";
        }
        break;

      case "detailed_compatibility":
        try {
          const output = await runPythonScript(pythonScriptPath, [
            "detailed_compatibility",
            loggedInUserId,
            targetUserId,
          ]);
          const compatibility = JSON.parse(output.trim());
          result.compatibility = compatibility;
        } catch (error) {
          result.error = "Failed to calculate detailed compatibility";
        }
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 }
        );
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
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const targetUserId = searchParams.get("targetUserId");
  const topN = parseInt(searchParams.get("topN") || "10");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  try {
    const pythonScriptPath = path.join(
      process.cwd(),
      "src",
      "app",
      "similarity_api.py"
    );
    let result: SimilarityResponse = {};

    switch (action) {
      case "similarity":
        if (!targetUserId) {
          return NextResponse.json(
            { error: "Missing targetUserId for similarity calculation" },
            { status: 400 }
          );
        }
        const output = await runPythonScript(pythonScriptPath, [
          "similarity",
          userId,
          targetUserId,
        ]);
        result.similarity = parseFloat(output.trim());
        break;

      case "similar_users":
        const similarOutput = await runPythonScript(pythonScriptPath, [
          "similar_users",
          userId,
          topN.toString(),
        ]);
        const similarUsers = JSON.parse(similarOutput.trim());
        result.similarUsers = similarUsers.map((item: [string, number]) => ({
          userId: item[0],
          score: item[1],
        }));
        break;

      default:
        return NextResponse.json(
          { error: "Invalid or missing action parameter" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
