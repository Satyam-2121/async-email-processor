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
  const { email } = req.body;

  await emailQueue.add(
    "send-email",
    { email },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  res.json({
    success: true,
    message: "Job added to queue",
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
