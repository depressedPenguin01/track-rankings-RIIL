import { useMemo, useState } from "react";
import Papa from "papaparse";
import { supabase } from "./supabase";

const requiredColumns = [
  "athlete",
  "team",
  "gender",
  "event",
  "mark",
  "date",
  "venue",
  "meet",
];

function parseMarkToNumber(event, mark) {
  if (!mark) return NaN;

  const trimmed = String(mark).trim();

  if (["800m", "1600m", "3200m"].includes(event) && trimmed.includes(":")) {
    const [min, sec] = trimmed.split(":");
    return Number(min) * 60 + Number(sec);
  }

  if (["100m", "200m", "400m"].includes(event)) {
    return Number(trimmed);
  }

  if (["Long Jump", "High Jump", "Shot Put", "Discus"].includes(event)) {
    const normalized = trimmed.replace(/'/g, "-").replace(/\s+/g, "");
    if (normalized.includes("-")) {
      const [feet, inches] = normalized.split("-");
      return Number(feet) + Number(inches) / 100;
    }
    return Number(trimmed);
  }

  return Number(trimmed);
}

export default function CsvUpload() {
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [defaults, setDefaults] = useState({
    meet: "",
    venue: "",
    date: "",
    event: "",
    gender: "",
  });

  function handleDefaultsChange(e) {
    const { name, value } = e.target;
    setDefaults((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMessage("");

   Papa.parse(file, {
  header: false, // important
  skipEmptyLines: true,
  complete: (results) => {
    const lines = results.data;

    let currentGender = "";
    let headers = [];

    const parsedRows = [];

    for (let i = 0; i < lines.length; i++) {
      const row = lines[i].map((cell) => String(cell).trim());

      // Detect gender section
      if (row[0] === "Boys" || row[0] === "Girls") {
        currentGender = row[0];
        headers = [];
        continue;
      }

      // Detect header row
      if (!headers.length && row.includes("athlete")) {
        headers = row;
        continue;
      }

      // Skip if no headers or no gender
      if (!headers.length || !currentGender) continue;

      // Build object from headers
      const obj = {};
      headers.forEach((key, index) => {
        obj[key] = row[index];
      });

      parsedRows.push({
        ...obj,
        gender: currentGender,
      });
    }

    setRawRows(parsedRows);
  },
});
  }

  const processed = useMemo(() => {
    if (!rawRows.length) {
      return { previewRows: [], invalidRows: [], validPayload: [] };
    }

    const previewRows = rawRows.map((row) => ({
      athlete: String(row.athlete || "").trim(),
      team: String(row.team || "").trim(),
      gender: String(row.gender || "").trim() || defaults.gender.trim(),
      event: String(row.event || "").trim() || defaults.event.trim(),
      mark: String(row.mark || "").trim(),
      date: String(row.date || "").trim() || defaults.date.trim(),
      venue: String(row.venue || "").trim() || defaults.venue.trim(),
      meet: String(row.meet || "").trim() || defaults.meet.trim(),
    }));

    const invalidRows = [];
    const validPayload = [];

    previewRows.forEach((row, index) => {
      const missing = requiredColumns.filter((col) => !row[col]);
      const numericMark = parseMarkToNumber(row.event, row.mark);

      if (missing.length || Number.isNaN(numericMark)) {
        invalidRows.push({
          rowNumber: index + 2,
          row,
          problems: [
            ...(missing.length ? [`Missing: ${missing.join(", ")}`] : []),
            ...(Number.isNaN(numericMark) ? ["Invalid mark format"] : []),
          ],
        });
        return;
      }

      validPayload.push({
        athlete: row.athlete,
        team: row.team,
        gender: row.gender,
        event: row.event,
        mark: row.mark,
        numeric_mark: numericMark,
        date: row.date,
        venue: row.venue,
        meet: row.meet,
      });
    });

    return { previewRows, invalidRows, validPayload };
  }, [rawRows, defaults]);

  async function handleUpload() {
    if (!processed.validPayload.length) {
      setMessage("No valid rows to upload.");
      return;
    }

    setUploading(true);
    setMessage("");

    const { error } = await supabase.from("marks").insert(processed.validPayload);

    if (error) {
      console.error(error);
      setMessage("Upload failed.");
    } else {
      setMessage(`Uploaded ${processed.validPayload.length} rows successfully.`);
      setRawRows([]);
      setFileName("");
    }

    setUploading(false);
  }

  return (
    <div className="panel">
      <h2>CSV Upload</h2>
      <p>Upload a full CSV or a partial CSV and let shared fields fill in the blanks.</p>

      <div className="entry-form" style={{ marginBottom: "16px" }}>
        <input
          name="meet"
          value={defaults.meet}
          onChange={handleDefaultsChange}
          placeholder="Default meet name"
        />
        <input
          name="venue"
          value={defaults.venue}
          onChange={handleDefaultsChange}
          placeholder="Default venue"
        />
        <input
          type="date"
          name="date"
          value={defaults.date}
          onChange={handleDefaultsChange}
        />
        <input
          name="event"
          value={defaults.event}
          onChange={handleDefaultsChange}
          placeholder="Default event (ex: 100m)"
        />
      </div>

      <input type="file" accept=".csv" onChange={handleFileChange} />

      {fileName && <p><strong>File:</strong> {fileName}</p>}
      {message && <p><strong>{message}</strong></p>}

      {!!processed.previewRows.length && (
        <>
          <p>
            Parsed <strong>{processed.previewRows.length}</strong> rows. Valid rows:{" "}
            <strong>{processed.validPayload.length}</strong>. Invalid rows:{" "}
            <strong>{processed.invalidRows.length}</strong>.
          </p>

          {processed.invalidRows.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h3>Invalid Rows</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>CSV Row</th>
                      <th>Problems</th>
                      <th>Athlete</th>
                      <th>Event</th>
                      <th>Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.invalidRows.map((item) => (
                      <tr key={item.rowNumber}>
                        <td>{item.rowNumber}</td>
                        <td>{item.problems.join(" | ")}</td>
                        <td>{item.row.athlete}</td>
                        <td>{item.row.event}</td>
                        <td>{item.row.mark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Athlete</th>
                  <th>Team</th>
                  <th>Gender</th>
                  <th>Event</th>
                  <th>Mark</th>
                  <th>Date</th>
                  <th>Venue</th>
                  <th>Meet</th>
                </tr>
              </thead>
              <tbody>
                {processed.previewRows.slice(0, 20).map((row, index) => (
                  <tr key={index}>
                    <td>{row.athlete}</td>
                    <td>{row.team}</td>
                    <td>{row.gender}</td>
                    <td>{row.event}</td>
                    <td>{row.mark}</td>
                    <td>{row.date}</td>
                    <td>{row.venue}</td>
                    <td>{row.meet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !processed.validPayload.length}
            style={{ marginTop: "16px" }}
          >
            {uploading ? "Uploading..." : "Upload Valid Rows"}
          </button>
        </>
      )}
    </div>
  );
}