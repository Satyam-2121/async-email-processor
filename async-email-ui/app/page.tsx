"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const sendEmail = async () => {
    try {
      const res = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("✅ Email queued successfully");
      } else {
        setStatus("❌ Failed");
      }
    } catch (error) {
      setStatus("❌ Cannot connect to API");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-8 rounded-3xl border border-zinc-800 bg-zinc-900">
        <h1 className="text-3xl font-bold mb-4">
          Async Email Processor
        </h1>

        <p className="text-zinc-400 mb-6">
          Send emails through Redis + BullMQ
        </p>

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 mb-4"
        />

        <button
          onClick={sendEmail}
          className="w-full p-3 rounded-xl bg-white text-black font-semibold"
        >
          Send Email
        </button>

        {status && (
          <p className="mt-4 text-center">
            {status}
          </p>
        )}
      </div>
    </main>
  );
}