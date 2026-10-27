import { redirect } from "next/navigation";

// Old route — the guide was renamed to Dictionary. Keep bookmarks working.
export default function GuideRedirect() {
  redirect("/dictionary");
}
