import { useState } from "react";
import { slugify } from "@monokeros/utils";

export function useNameWithSlug(initial?: { name: string; slug: string }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  return { name, slug, setName, setSlug, handleNameChange, handleSlugChange };
}
