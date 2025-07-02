import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import supabase from "./client";
//middleware is meant to refresh your tokens
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const getSession = async () => {
    const {
      data: { session },
    } = await supabase().auth.getSession();
    console.log("session", session);
  };

  await supabase().auth.getUser();

  return response;
}
