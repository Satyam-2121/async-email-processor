import { UnrecoverableError, Worker } from "bullmq";
import nodemailer from "nodemailer";
import { redisConnection } from "../redisConnection";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Error:", error);
  } else {
    console.log("SMTP Ready");
  }
});

const worker = new Worker(
  "emailQueue",
  async (job) => {
    console.log("Processing job:", job.id);

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: job.data.email,
        subject: "Test Email from BullMQ",
        text: "Hello! This email was sent asynchronously using Redis + BullMQ.",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "responseCode" in error &&
        typeof error.responseCode === "number" &&
        error.responseCode >= 500 &&
        error.responseCode < 600
      ) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }

    console.log("Email sent!");
  },
  { connection: redisConnection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job?.id} completed`);
});

worker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} failed`);
  console.log(err.message);
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    await worker.close();
  } catch (error) {
    console.error("Could not close email worker:", error);
    process.exitCode = 1;
  } finally {
    transporter.close();
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
