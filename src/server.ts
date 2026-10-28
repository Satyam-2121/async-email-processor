import cors from "cors";
import express from "express";
import { emailQueue } from "./queues/emailQueue";

const app = express();

app.get("/", (req, res) => {
  res.send("Server is running!");
});
app.use(express.json());
app.use(cors());


app.post("/send-email", async (req, res) => {
  const email = req.body?.email;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid email address is required",
    });
  }

  try {
    await emailQueue.add(
      "send-email",
      { email: email.trim() },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );
  } catch (error) {
    console.error("Failed to queue email:", error);
    return res.status(503).json({
      success: false,
      message: "Email service is temporarily unavailable",
    });
  }

  res.json({
    success: true,
    message: "Job added to queue",
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
