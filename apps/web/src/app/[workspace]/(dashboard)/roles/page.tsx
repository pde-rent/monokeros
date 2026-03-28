"use client";

import { redirect } from "next/navigation";
import { useParams } from "next/navigation";

export default function RolesPage() {
  const { workspace } = useParams<{ workspace: string }>();
  redirect(`/${workspace}/boxes`);
}
