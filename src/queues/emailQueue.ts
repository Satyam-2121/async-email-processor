import { Queue } from "bullmq";

export const emailQueue = new Queue("emailQueue", {
  connection: {
    maxRetriesPerRequest: null,
  },
});