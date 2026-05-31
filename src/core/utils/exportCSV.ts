/**
 * Converts an array of flat objects to a CSV blob and triggers a browser download.
 * Uses the keys of the first row as column headers.
 */
export function exportToCSV(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          let str = val === null || val === undefined ? "" : String(val);
          // Prevent CSV formula injection (spreadsheet apps execute cells starting with =+-@)
          if (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
            str = "'" + str;
          }
          // Escape quotes and wrap in quotes if contains comma/newline/quote
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
