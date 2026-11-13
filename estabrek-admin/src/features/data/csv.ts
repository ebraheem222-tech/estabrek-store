/**
 * A CSV file read in the browser (the data grid's import): quoted cells, quotes inside them, line
 * breaks inside cells, the UTF-8 mark at the start, and the separator found by itself (comma,
 * semicolon or tab: spreadsheets in some languages save with ";"). Pure (tested).
 */

/** The separator the first line uses most, outside quotes. */
export function separatorOf(text: string): "," | ";" | "\t" {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "\n" || ch === "\r")) break;
    else if (!quoted && ch in counts) counts[ch] += 1;
  }
  return counts[";"] > counts[","] && counts[";"] >= counts["\t"] ? ";" : counts["\t"] > counts[","] ? "\t" : ",";
}

/** Every line's cells. Empty lines are left out; a quote left open takes the rest of the file as one cell. */
export function parseCsv(input: string, separator: string = separatorOf(input)): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let wasQuoted = false;
  const endCell = () => {
    row.push(wasQuoted ? cell : cell.trim());
    cell = "";
    wasQuoted = false;
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell.trim() === "") {
      quoted = true;
      wasQuoted = true;
      cell = "";
    } else if (ch === separator) endCell();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRow();
    } else cell += ch;
  }
  if (cell !== "" || row.length) endRow();
  return rows;
}
