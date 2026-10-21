export type CsvCell = string | number | boolean | null;

export type CsvTable = {
  headers: string[];
  rows: string[][];
};

export const MAX_CSV_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_CSV_DATA_ROWS = 25_000;
export const MAX_CSV_COLUMNS = 100;

export type CsvParseOptions = {
  maxBytes?: number;
  maxRows?: number;
  maxColumns?: number;
  /** Empty physical lines are ignored by default. A line containing spaces is data. */
  skipBlankLines?: boolean;
};

export type CsvSerializeOptions = {
  lineEnding?: "\n" | "\r\n";
};

export class CsvParseError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`${message} (line ${line}, column ${column}).`);
    this.name = "CsvParseError";
    this.line = line;
    this.column = column;
  }
}

export class CsvSerializeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvSerializeError";
  }
}

/**
 * Parse strict comma-separated UTF-8 text. Headers are preserved verbatim but
 * must be nonblank and unique after trimming (case-sensitive). Empty physical
 * lines are ignored; whitespace-only lines remain one-cell records. A final
 * line ending terminates the previous record and does not add another record.
 */
export function parseCsv(input: string, options: CsvParseOptions = {}): CsvTable {
  const maxBytes = options.maxBytes ?? MAX_CSV_INPUT_BYTES;
  const maxRows = options.maxRows ?? MAX_CSV_DATA_ROWS;
  const maxColumns = options.maxColumns ?? MAX_CSV_COLUMNS;
  if (new TextEncoder().encode(input).byteLength > maxBytes) {
    const maxMegabytes = maxBytes / (1024 * 1024);
    const limit = Number.isInteger(maxMegabytes) ? `${maxMegabytes} MB` : `${maxBytes} bytes`;
    throw new CsvParseError(`CSV exceeds the ${limit} input limit`, 1, 1);
  }
  const skipBlankLines = options.skipBlankLines ?? true;
  const source = input.startsWith("\uFEFF") ? input.slice(1) : input;
  const records: Array<{ fields: string[]; line: number }> = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;
  let recordTouched = false;
  let line = 1;
  let column = 1;
  let recordStartLine = 1;

  const fail = (message: string): never => { throw new CsvParseError(message, line, column); };
  const pushField = () => {
    fields.push(field);
    field = "";
    if (fields.length > maxColumns) fail(`CSV exceeds the ${maxColumns} column limit`);
  };
  const finishRecord = () => {
    if (recordTouched || field.length > 0) {
      pushField();
      records.push({ fields, line: recordStartLine });
      if (records.length > 1 && records.length - 1 > maxRows) {
        fail(`CSV exceeds the ${maxRows} data row limit`);
      }
    } else if (!skipBlankLines) {
      pushField();
      records.push({ fields, line: recordStartLine });
    }
    fields = [];
    field = "";
    recordTouched = false;
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          index += 1;
          column += 2;
        } else {
          inQuotes = false;
          afterQuote = true;
          column += 1;
        }
      } else if (char === "\r") {
        field += "\r";
        if (next === "\n") {
          field += "\n";
          index += 1;
        }
        line += 1;
        column = 1;
      } else if (char === "\n") {
        field += "\n";
        line += 1;
        column = 1;
      } else {
        field += char;
        column += 1;
      }
      continue;
    }

    if (afterQuote) {
      if (char === ",") {
        pushField();
        recordTouched = true;
        afterQuote = false;
        column += 1;
      } else if (char === "\r" || char === "\n") {
        finishRecord();
        if (char === "\r" && next === "\n") index += 1;
        line += 1;
        column = 1;
        recordStartLine = line;
        afterQuote = false;
      } else {
        fail("Unexpected character after a closing quote");
      }
      continue;
    }

    if (char === '"') {
      if (field.length > 0) fail("A quote may only begin at the start of a field");
      inQuotes = true;
      recordTouched = true;
      column += 1;
    } else if (char === ",") {
      pushField();
      recordTouched = true;
      column += 1;
    } else if (char === "\r" || char === "\n") {
      finishRecord();
      if (char === "\r" && next === "\n") index += 1;
      line += 1;
      column = 1;
      recordStartLine = line;
    } else {
      field += char;
      recordTouched = true;
      column += 1;
    }
  }

  if (inQuotes) fail("CSV ends inside a quoted field");
  if (recordTouched || field.length > 0 || fields.length > 0 || afterQuote) finishRecord();

  if (!records.length) throw new CsvParseError("CSV is empty; add a header row", 1, 1);
  const [headerRecord, ...dataRecords] = records;
  const headers = headerRecord.fields;
  if (!headers.length) throw new CsvParseError("CSV must have at least one header", headerRecord.line, 1);

  const seenHeaders = new Set<string>();
  headers.forEach((header, index) => {
    const normalized = header.trim();
    if (!normalized) throw new CsvParseError("CSV headers cannot be empty or whitespace-only", headerRecord.line, index + 1);
    if (seenHeaders.has(normalized)) throw new CsvParseError(`Duplicate CSV header: ${normalized}`, headerRecord.line, index + 1);
    seenHeaders.add(normalized);
  });

  for (const record of dataRecords) {
    if (record.fields.length !== headers.length) {
      throw new CsvParseError(`Expected ${headers.length} fields but found ${record.fields.length}`, record.line, record.fields.length + 1);
    }
  }
  return { headers, rows: dataRecords.map(({ fields: row }) => row) };
}

/** Serialize a table using ordinary CSV syntax without changing cell values. */
export function serializeCsv(table: { headers: readonly CsvCell[]; rows: readonly (readonly CsvCell[])[] }, options: CsvSerializeOptions = {}): string {
  validateTable(table);
  const lineEnding = options.lineEnding ?? "\n";
  return [table.headers, ...table.rows]
    .map((row) => row.map((cell) => quoteCsvCell(cell === null ? "" : String(cell))).join(","))
    .join(lineEnding);
}

/**
 * Spreadsheet-oriented export policy: prefix text cells likely to be parsed
 * as formulas with an apostrophe. Numeric JSON values remain numeric. CSV
 * import behavior differs between spreadsheet applications, so this is a
 * precaution and not a universal guarantee.
 */
export function serializeSpreadsheetSafeCsv(
  table: { headers: readonly CsvCell[]; rows: readonly (readonly CsvCell[])[] },
  options: CsvSerializeOptions = {},
): string {
  validateTable(table);
  const protect = (value: CsvCell): CsvCell => {
    if (typeof value !== "string") return value;
    return isFormulaLikeText(value) ? `'${value}` : value;
  };
  return serializeCsv({ headers: table.headers.map(protect), rows: table.rows.map((row) => row.map(protect)) }, options);
}

function isFormulaLikeText(value: string): boolean {
  if (/^[\t\r]/.test(value)) return true;
  const significant = value.replace(/^[\s\u0000-\u001f]+/, "");
  if (/^[=+@]/.test(significant)) return true;
  if (significant.startsWith("-")) return !/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(significant);
  return false;
}

function validateTable(table: { headers: readonly CsvCell[]; rows: readonly (readonly CsvCell[])[] }): void {
  if (!table.headers.length) throw new CsvSerializeError("CSV needs at least one header.");
  for (const [index, header] of table.headers.entries()) {
    if (header === null || !String(header).trim()) throw new CsvSerializeError(`CSV header ${index + 1} cannot be empty.`);
  }
  const normalized = table.headers.map((header) => String(header).trim());
  if (new Set(normalized).size !== normalized.length) throw new CsvSerializeError("CSV headers must be unique after trimming whitespace.");
  for (const [index, row] of table.rows.entries()) {
    if (row.length !== table.headers.length) throw new CsvSerializeError(`CSV row ${index + 1} has ${row.length} fields; expected ${table.headers.length}.`);
  }
}

function quoteCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
