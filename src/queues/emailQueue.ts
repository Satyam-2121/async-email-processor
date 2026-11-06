import { Queue } from "bullmq";

export const emailQueue = new Queue("emailQueue", {
  connection: {
    // HTTP requests should fail during Redis outages instead of waiting forever.
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  },
});
