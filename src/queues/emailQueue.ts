import { Queue } from "bullmq";
import { redisConnection } from "../redisConnection";

export const emailQueue = new Queue("emailQueue", {
  connection: {
    ...redisConnection,
    // HTTP requests should fail during Redis outages instead of waiting forever.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  },
});

// BullMQ emits connection errors independently of failed enqueue requests.
// Handle them so an unavailable Redis server does not terminate the API.
emailQueue.on("error", (error) => {
  console.error("Email queue connection error:", error.message);
});

let initialized = false;
void emailQueue.waitUntilReady().then(
  () => { initialized = true; },
  (error) => { console.error("Email queue initialization failed:", error.message); },
);

export async function enqueueEmail(email: string) {
  if (!initialized) {
    throw new Error("Email queue is not ready");
  }

  return emailQueue.add("send-email", { email }, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}
