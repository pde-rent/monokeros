"use client";

import { useState } from "react";
import { Dialog, Button, Input, DropdownSelect } from "@monokeros/ui";
import { FilePlusIcon, FolderPlusIcon, ArticleIcon } from "@phosphor-icons/react";

export type CreateMode = "file" | "folder" | "page";

interface Props {
  mode: CreateMode;
  onSubmit: (name: string, extension?: string) => void;
  onClose: () => void;
}

const FILE_EXTENSIONS = [
  { value: "md", label: ".md (Markdown)" },
  { value: "mdx", label: ".mdx" },
  { value: "txt", label: ".txt" },
  { value: "json", label: ".json" },
  { value: "toml", label: ".toml" },
  { value: "yml", label: ".yml" },
  { value: "csv", label: ".csv" },
  { value: "tsv", label: ".tsv" },
  { value: "conf", label: ".conf" },
  { value: "ts", label: ".ts" },
  { value: "tsx", label: ".tsx" },
  { value: "js", label: ".js" },
  { value: "jsx", label: ".jsx" },
  { value: "py", label: ".py" },
  { value: "rs", label: ".rs" },
  { value: "go", label: ".go" },
  { value: "java", label: ".java" },
  { value: "cs", label: ".cs" },
  { value: "cpp", label: ".cpp" },
  { value: "c", label: ".c" },
  { value: "h", label: ".h" },
  { value: "hpp", label: ".hpp" },
  { value: "zig", label: ".zig" },
  { value: "rb", label: ".rb" },
  { value: "sh", label: ".sh" },
  { value: "bash", label: ".bash" },
  { value: "zsh", label: ".zsh" },
  { value: "css", label: ".css" },
  { value: "html", label: ".html" },
  { value: "tex", label: ".tex" },
  { value: "ad", label: ".ad (AsciiDoc)" },
  { value: "", label: "No extension" },
];

export function CreateDialog({ mode, onSubmit, onClose }: Props) {
  const [name, setName] = useState("");
  const [extension, setExtension] = useState("md");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (mode === "folder" || mode === "page") {
      onSubmit(trimmed);
    } else {
      onSubmit(trimmed, extension || undefined);
    }
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={mode === "file" ? "New File" : mode === "page" ? "New Page" : "New Folder"}
      icon={
        mode === "file" ? (
          <FilePlusIcon size={14} weight="bold" />
        ) : mode === "page" ? (
          <ArticleIcon size={14} weight="bold" />
        ) : (
          <FolderPlusIcon size={14} weight="bold" />
        )
      }
      width={320}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          variant="compact"
          label="Name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode === "file" ? "filename" : mode === "page" ? "Page Name" : "folder-name"}
        />

        {mode === "file" && (
          <DropdownSelect
            label="Type"
            value={extension}
            onChange={setExtension}
            options={FILE_EXTENSIONS}
            size="compact"
          />
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
