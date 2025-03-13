"use client"; // This makes the component interactive

import { useState, useEffect } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface LogEntry {
  _id: string;
  text: string;
  type: string;
  startTime: string;
  endTime?: string;
  accumulatedDuration?: number; // in milliseconds, from the Mongoose model
}

export default function Home() {
  const [text, setText] = useState<string>("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  // Fetch logs when the page loads
  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const response = await fetch("/api/logs");
    const data: LogEntry[] = await response.json();
    setEntries(data);
  };

  // Only the Start button remains for creating new logs.
  const handleSubmit = async () => {
    if (text.trim() === "") {
      alert("Please enter some text.");
      return;
    }

    const response = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // We're now hardcoding the type as "start" since other buttons are removed.
      body: JSON.stringify({ text, type: "start" }),
    });

    if (response.ok) {
      setText("");
      fetchEntries();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    fetchEntries();
  };

  const handleEditClick = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleEditSave = async (id: string) => {
    await fetch(`/api/logs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText }),
    });
    setEditingId(null);
    fetchEntries();
  };

  // Function to end a log.
  const handleEndLog = async (id: string) => {
    await fetch(`/api/logs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end: true }),
    });
    fetchEntries();
  };

  // Function to reopen a log (continue counting time)
  const handleReopenLog = async (id: string) => {
    await fetch(`/api/logs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reopen: true }),
    });
    fetchEntries();
  };

  const exportToCSV = () => {
    const csvData = Papa.unparse(entries, { header: true });
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logs.csv";
    link.click();
  };

  const exportToPDF = async () => {
    const doc = new jsPDF() as any;
    doc.text("Log Entries", 14, 20);

    doc.autoTable({
      startY: 30,
      head: [["Text", "Type", "Started At", "Ended At", "Duration"]],
      body: entries.map(({ text, type, startTime, endTime, accumulatedDuration }) => {
        let durationDisplay = "-";
        if (accumulatedDuration) {
          const minutes = Math.floor(accumulatedDuration / 60000);
          const seconds = Math.floor((accumulatedDuration % 60000) / 1000);
          durationDisplay = `${minutes}m ${seconds}s`;
        }
        return [
          text,
          type,
          new Date(startTime).toLocaleString(),
          endTime ? new Date(endTime).toLocaleString() : "-",
          durationDisplay,
        ];
      }),
    });

    doc.save("logs.pdf");
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>📜 Text Logger</h2>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text here..."
        style={{ width: "80%", padding: "10px" }}
      />
      <button onClick={handleSubmit} style={{ margin: "10px" }}>
        Start
      </button>

      <div style={{ margin: "20px" }}>
        <button onClick={exportToCSV} style={{ marginRight: "10px" }}>
          📄 Export CSV
        </button>
        <button onClick={exportToPDF}>📜 Export PDF</button>
      </div>

      <table
        style={{
          width: "100%",
          marginTop: "20px",
          border: "1px solid black",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={cellStyle}>Text</th>
            <th style={cellStyle}>Type</th>
            <th style={cellStyle}>Started At</th>
            <th style={cellStyle}>Ended At</th>
            <th style={cellStyle}>Duration</th>
            <th style={cellStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry._id}>
              <td style={cellStyle}>
                {editingId === entry._id ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                ) : (
                  entry.text
                )}
              </td>
              <td style={cellStyle}>{entry.type}</td>
              <td style={cellStyle}>
                {new Date(entry.startTime).toLocaleString()}
              </td>
              <td style={cellStyle}>
                {entry.endTime
                  ? new Date(entry.endTime).toLocaleString()
                  : "-"}
              </td>
              <td style={cellStyle}>
                {entry.accumulatedDuration
                  ? (() => {
                      const minutes = Math.floor(entry.accumulatedDuration / 60000);
                      const seconds = Math.floor((entry.accumulatedDuration % 60000) / 1000);
                      return `${minutes}m ${seconds}s`;
                    })()
                  : "-"}
              </td>
              <td style={cellStyle}>
                {editingId === entry._id ? (
                  <button onClick={() => handleEditSave(entry._id)}>Save</button>
                ) : (
                  <>
                    <button onClick={() => handleEditClick(entry._id, entry.text)}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(entry._id)}>
                      Delete
                    </button>
                    {entry.endTime ? (
                      <button onClick={() => handleReopenLog(entry._id)}>
                        Reopen Log
                      </button>
                    ) : (
                      <button onClick={() => handleEndLog(entry._id)}>
                        End Log
                      </button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  border: "1px solid black",
  padding: "8px",
};
