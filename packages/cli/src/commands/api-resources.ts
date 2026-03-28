/**
 * mk api-resources — list all available resource types with their short names.
 *
 * Similar to `kubectl api-resources`, shows what resources the CLI supports
 * and their aliases/short names.
 */

import { Command } from "commander";
import { allResources, type ResourceType } from "../resources";
import { Formatter, type ColumnDef } from "../fmt/formatter";

const RESOURCE_COLUMNS: ColumnDef<ResourceType>[] = [
  { header: "NAME", value: (r) => r.name },
  { header: "SHORT", value: (r) => r.short },
  { header: "API PREFIX", value: (r) => r.apiPrefix },
  { header: "ALIASES", value: (r) => (r.aliases ?? []).join(", ") },
];

export function registerApiResourcesCommand(program: Command): void {
  program
    .command("api-resources")
    .description("List supported resource types and their short names")
    .action(() => {
      console.log(new Formatter(RESOURCE_COLUMNS).format(allResources(), "table"));
    });
}
