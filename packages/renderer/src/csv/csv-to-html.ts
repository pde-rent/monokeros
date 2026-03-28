/**
 * Parse CSV/TSV content and render as an HTML table.
 * Lightweight implementation - no external dependency needed.
 */
export function renderCSV(content: string, delimiter: string = ","): string {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return "<p>Empty file</p>";

  const rows = lines.map((line) => parseCsvLine(line, delimiter));
  if (rows.length === 0) return "<p>Empty file</p>";

  let html = '<div class="csv-table-wrapper"><table class="csv-table">';

  // First row as header
  html += "<thead><tr>";
  for (const cell of rows[0]) {
    html += `<th>${escapeHtml(cell)}</th>`;
  }
  html += "</tr></thead>";

  // Remaining rows as body
  if (rows.length > 1) {
    html += "<tbody>";
    for (let i = 1; i < rows.length; i++) {
      html += "<tr>";
      for (const cell of rows[i]) {
        html += `<td>${escapeHtml(cell)}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody>";
  }

  html += "</table></div>";
  return html;
}

/** Simple CSV line parser handling quoted fields */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
