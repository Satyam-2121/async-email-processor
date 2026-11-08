import { Queue } from "bullmq";

export const emailQueue = new Queue("emailQueue", {
  connection: {
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
