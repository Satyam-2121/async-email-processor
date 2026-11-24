import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { enqueueEmail } from "./queues/emailQueue";

const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.send("Server is running!");
});
app.use(express.json());


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
    const job = await enqueueEmail(email.trim());
    return res.json({
      success: true,
      message: "Job added to queue",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Failed to queue email:", error);
    return res.status(503).json({
      success: false,
      message: "Email service is temporarily unavailable",
    });
  }
});

const handleJsonErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Invalid JSON request body" });
  } else if (error.type === "entity.too.large") {
    res.status(413).json({ success: false, message: "Request body is too large" });
  } else {
    next(error);
  }
};

app.use(handleJsonErrors);

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
