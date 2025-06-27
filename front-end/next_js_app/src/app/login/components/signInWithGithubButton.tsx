import { Button } from "@/components/ui/button";
import { signInWithGithub } from "@/lib/auth-actions";

const signInWithGithubButton = () => {
  return <Button onClick={signInWithGithub}>Login with Github</Button>;
};
export default signInWithGithubButton;
