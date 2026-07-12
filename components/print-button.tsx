"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{
        position: "fixed",
        top: "18px",
        right: "18px",
        background: "#C0182A",
        color: "#fff",
        border: "none",
        padding: "10px 22px",
        fontSize: "13px",
        fontWeight: "bold",
        cursor: "pointer",
        borderRadius: "6px",
        zIndex: 999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      🖨 Drucken / PDF
    </button>
  );
}
