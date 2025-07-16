import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

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

export async function POST(_request: NextRequest) {
  try {
    // Path to the Python similarity service
    const pythonScriptPath = path.join(
      process.cwd(),
      "src",
      "app",
      "similarity_api.py"
    );

    // Refresh the similarity data
    await runPythonScript(pythonScriptPath, ["refresh"]);

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
