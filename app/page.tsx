import { redirect } from "next/navigation";
import { globalGETRateLimit } from "@/lib/requests";
import type { JSX } from "react";
import { getCurrentSession } from "./actions";
import { LogoutButton } from "@/components/LogoutButton";

export default async function ProfileContent(): Promise<JSX.Element> {
  const { user, session } = await getCurrentSession();

  if (session === null) return redirect("/login");

  if (!(await globalGETRateLimit())) {
    return <div>Too many requests</div>;
  }

  return (
    <>
      <h1>{user.name}</h1>
      <img src={user.picture} alt="profile" />
      <p>{user.email}</p>
      <LogoutButton />
    </>
  );
}
