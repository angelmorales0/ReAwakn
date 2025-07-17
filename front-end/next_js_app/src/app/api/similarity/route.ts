import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

interface SimilarityRequest {
  loggedInUserId: string;
  targetUserId: string;
  action: "similarity";
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

/**
 * Runs a Python script with the given arguments and returns the output
 */
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
    //uses next JS api calls to run python script thru terminal
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

/**
 * Gets the path to the Python similarity script
 */
function getPythonScriptPath(): string {
  return path.join(process.cwd(), "src", "app", "similarity_api.py");
}

/**
 * Calculates similarity between two users
 */
async function calculateSimilarity(
  userId1: string,
  userId2: string,
  isGet: boolean = false
): Promise<{ similarity?: number; error?: string }> {
  try {
    const output = await runPythonScript(getPythonScriptPath(), [
      "similarity",
      userId1,
      userId2,
    ]);

    const trimmedOutput = output.trim();
    if (!trimmedOutput) {
      throw new Error("Empty response from similarity calculation");
    }

    const similarity = parseFloat(trimmedOutput);

    if (isNaN(similarity)) {
      throw new Error("Invalid similarity score: not a number");
    }

    if (similarity < 0 || similarity > 1) {
      throw new Error(`Similarity score out of expected range: ${similarity}`);
    }

    return { similarity };
  } catch (error: any) {
    const prefix = isGet ? "GET " : "";
    console.error(`${prefix}Similarity calculation error:`, error);
    return {
      error: `Failed to calculate similarity: ${
        error.message || "Unknown error"
      }`,
    };
  }
}

async function findSimilarUsers(
  userId: string,
  topN: number
): Promise<{
  similarUsers?: Array<{ userId: string; score: number }>;
  error?: string;
}> {
  try {
    const output = await runPythonScript(getPythonScriptPath(), [
      "similar_users",
      userId,
      topN.toString(),
    ]);

    const similarUsers = JSON.parse(output.trim());

    if (!Array.isArray(similarUsers)) {
      throw new Error("Invalid similar users data: not an array");
    }

    const invalidItems = [];
    for (let i = 0; i < similarUsers.length; i++) {
      const item = similarUsers[i];

      if (!Array.isArray(item) || item.length !== 2) {
        invalidItems.push(
          `Item at index ${i} is not a valid [userId, score] pair`
        );
        continue;
      }

      if (typeof item[0] !== "string") {
        invalidItems.push(`UserId at index ${i} is not a string`);
      }

      if (typeof item[1] !== "number" || isNaN(item[1])) {
        invalidItems.push(`Score at index ${i} is not a valid number`);
      }
    }

    if (invalidItems.length > 0) {
      throw new Error(`Invalid similar users data: ${invalidItems.join("; ")}`);
    }

    return {
      similarUsers: similarUsers.map((item: [string, number]) => ({
        userId: item[0],
        score: item[1],
      })),
    };
  } catch (error: any) {
    console.error("Similar users calculation error:", error);
    return {
      error: `Failed to find similar users: ${
        error.message || "Unknown error"
      }`,
    };
  }
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

    let result: SimilarityResponse = {};

    switch (action) {
      case "similarity":
        const similarityResult = await calculateSimilarity(
          loggedInUserId,
          targetUserId
        );
        if (similarityResult.similarity !== undefined) {
          result.similarity = similarityResult.similarity;
        } else if (similarityResult.error) {
          result.error = similarityResult.error;
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
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  //GET REQ
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
    let result: SimilarityResponse = {};

    switch (action) {
      case "similarity":
        if (!targetUserId) {
          return NextResponse.json(
            { error: "Missing targetUserId for similarity calculation" },
            { status: 400 }
          );
        }

        const similarityResult = await calculateSimilarity(
          userId,
          targetUserId,
          true
        );
        if (similarityResult.similarity !== undefined) {
          result.similarity = similarityResult.similarity;
        } else if (similarityResult.error) {
          result.error = similarityResult.error;
        }
        break;

      case "similar_users":
        const similarUsersResult = await findSimilarUsers(userId, topN);
        if (similarUsersResult.similarUsers) {
          result.similarUsers = similarUsersResult.similarUsers;
        } else if (similarUsersResult.error) {
          result.error = similarUsersResult.error;
        }
        break;

      default:
        return NextResponse.json(
          { error: "Invalid or missing action parameter" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

//route file is responsible for calling the correct action
