import "dotenv/config";
import { Worker } from "bullmq";
import nodemailer from "nodemailer";

console.log("USER:", process.env.EMAIL_USER);
console.log("PASS LENGTH:", process.env.EMAIL_PASS?.length);

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

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: job.data.email,
      subject: "Test Email from BullMQ",
      text: "Hello! This email was sent asynchronously using Redis + BullMQ.",
    });

    console.log("Email sent!");
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job?.id} completed`);
});

worker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} failed`);
  console.log(err.message);
});