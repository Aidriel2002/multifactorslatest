const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error("❌ Missing VITE_GOOGLE_API_KEY in environment variables");
  throw new Error("Missing VITE_GOOGLE_API_KEY in environment variables");
}

export function extractSpreadsheetId(input) {
  if (!input) return null;

  if (!input.includes("docs.google.com")) {
    return input;
  }

  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function fetchSitesFromGoogleSheets({
  spreadsheetId,
  sheetName
}) {
  const cleanSpreadsheetId = extractSpreadsheetId(spreadsheetId);

  if (!cleanSpreadsheetId || !sheetName) {
    throw new Error("Invalid spreadsheet ID or sheet name");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanSpreadsheetId}/values/${encodeURIComponent(
    sheetName
  )}?key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const errorText = await res.text();
      
      if (res.status === 403) {
        console.error("[API] ❌ 403 Forbidden");
        console.error("  Check: Sheet public? API enabled? Key valid?");
        throw new Error(
          "Access denied. Make sure the Google Sheet is public (Anyone with the link can view) and Google Sheets API is enabled."
        );
      }
      
      if (res.status === 404) {
        console.error("[API] ❌ 404 Not Found");
        console.error(`  Sheet: "${sheetName}"`);
        console.error(`  ID: ${cleanSpreadsheetId}`);
        throw new Error(
          `Sheet not found. Check the spreadsheet ID and sheet name "${sheetName}".`
        );
      }

      if (res.status === 400) {
        console.error("[API] ❌ 400 Bad Request:", errorText);
        throw new Error(`Bad request: ${errorText}`);
      }

      throw new Error(`Google Sheets Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      console.warn("[API] ⚠️ Sheet is empty");
      return [];
    }

    if (rows.length === 1) {
      console.warn("[API] ⚠️ Only headers found, no data rows");
      return [];
    }

    const headers = rows[0];

    const mappedData = rows.slice(1).map((row, index) => {
      const obj = { _rowNumber: index + 2 };
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex] || "";
      });
      return obj;
    });

    return mappedData;
  } catch (error) {
    console.error("[API] ❌ Error:", error.message);
    throw error;
  }
}

export async function appendLogToGoogleSheets() {
  throw new Error(
    "Google Sheets write operations require a backend server with Service Account credentials. " +
    "Frontend applications cannot securely write to Google Sheets using just an API key."
  );
}


export function isValidGoogleSheetsUrl(url) {
  if (!url) return false;
  
  return url.includes("docs.google.com/spreadsheets/d/") ||
         /^[a-zA-Z0-9-_]+$/.test(url); 
}