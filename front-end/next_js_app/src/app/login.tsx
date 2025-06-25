import "./login.css";
import { createClient } from "@supabase/supabase-js";

async function logIn() {
  "use server";
  console.log("logging in");
  const supabase = createClient;
  //await supabase.auth.signInWithOauth({ provider: "github" });
}

export default function Login() {
  return (
    <form
      className="flex-1 flex min-h-screen justify-center items-center login-form"
      action={logIn}
    >
      <button type="submit">
        <img src="/google.png" alt="github Login" className="w-6 h-6 mr-2" />
        Sign in with github
      </button>
    </form>
  );
}
