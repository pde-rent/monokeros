"use client";

import { useParams } from "next/navigation";
import { WikiPage } from "@/components/wiki/wiki-page";

export default function WikiSlugPage() {
  const params = useParams<{ slug?: string[] }>();
  const path = params.slug?.join("/") || "index";
  return <WikiPage initialPath={path} />;
}
