"use client";

// global-error แทนที่ root layout ทั้งหมดเมื่อเกิด error ระดับบนสุด
// จึงต้องมี <html>/<body> ของตัวเอง และห้ามพึ่ง component ที่ใช้ context ของ layout
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>เกิดข้อผิดพลาดร้ายแรง</h1>
        <p style={{ maxWidth: "24rem", color: "#666", fontSize: "0.875rem" }}>
          ระบบไม่สามารถทำงานต่อได้ กรุณาลองใหม่อีกครั้ง
        </p>
        <button
          onClick={reset}
          style={{
            height: "2.5rem",
            padding: "0 1rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          ลองใหม่อีกครั้ง
        </button>
      </body>
    </html>
  );
}
