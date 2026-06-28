import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (user) redirect("/dashboard");
  redirect("/login");
}
