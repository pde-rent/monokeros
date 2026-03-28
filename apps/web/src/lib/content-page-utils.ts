export interface NavItem {
  title: string;
  path: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavManifest {
  title: string;
  sections: NavSection[];
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/** Extract headings from rendered HTML for table of contents. */
export function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = [];
  const regex = /<h([2-4])\s+id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      id: match[2],
      text: match[3].replace(/<[^>]*>/g, ""),
    });
  }
  return headings;
}

/** Flatten nav sections into a linear page list for prev/next navigation. */
export function flattenNavPages(nav: NavManifest | undefined): NavItem[] {
  if (!nav?.sections) return [];
  return nav.sections.flatMap((section) =>
    section.items.map((item) => ({ title: item.title, path: item.path })),
  );
}
