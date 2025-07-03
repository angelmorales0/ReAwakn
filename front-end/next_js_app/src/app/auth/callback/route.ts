import { NextRequest, NextResponse } from "next/server";
import createClient from "@/app/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      } else {
        return NextResponse.redirect(
          `${origin}/error?message=${encodeURIComponent(error.message)}`
        );
      }
    } catch (err) {
      return NextResponse.redirect(
        `${origin}/error?message=${encodeURIComponent("Authentication failed")}`
      );
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/error?message=${encodeURIComponent(
      "No authorization code provided"
    )}`
  );
}
