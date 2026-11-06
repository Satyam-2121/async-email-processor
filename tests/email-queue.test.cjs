const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { createServer } = require("node:net");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const { test } = require("node:test");
const vm = require("node:vm");
const { Queue } = require("bullmq");
const ts = require("typescript");

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startRedis(port) {
  const process = spawn("redis-server", [
    "--bind", "127.0.0.1", "--port", String(port),
    "--save", "", "--appendonly", "no",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    let output = "";
    process.once("error", reject);
    process.once("exit", (code) => reject(new Error(`Redis exited: ${code}`)));
    process.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.includes("Ready to accept connections")) resolve();
    });
  });
  return process;
}

async function stopRedis(process) {
  if (!process || process.exitCode !== null) return;
  await new Promise((resolve) => {
    process.once("exit", resolve);
    process.kill("SIGTERM");
  });
}

function loadQueue(port) {
  const source = readFileSync(path.join(__dirname, "../src/queues/emailQueue.ts"), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require(name) {
      assert.equal(name, "bullmq");
      return {
        Queue: class extends Queue {
          constructor(name, options) {
            // Exercise the application's real queue settings against an isolated Redis.
            super(name, {
              ...options,
              connection: { ...options.connection, host: "127.0.0.1", port },
            });
          }
        },
      };
    },
  });
  return exports.emailQueue;
}

test("email producer rejects during a Redis outage and recovers afterward", {
  timeout: 15000,
  skip: spawnSync("redis-server", ["--version"]).status !== 0
    ? "Install redis-server to run the queue integration test"
    : false,
}, async (t) => {
  const port = await freePort();
  let redis = await startRedis(port);
  let queue;
  let client;
  t.after(async () => {
    // Disconnect directly: waiting for an "end" event can hang during reconnection.
    if (client) client.disconnect();
    await stopRedis(redis);
  });
  queue = loadQueue(port);
  queue.on("error", () => {});
  client = await queue.waitUntilReady();
  const job = await queue.add("send-email", { email: "before@example.com" });
  assert.ok(job.id);

  const disconnected = new Promise((resolve) => queue.once("ioredis:close", resolve));
  await stopRedis(redis);
  await disconnected;
  await assert.rejects(Promise.race([
    queue.add("send-email", { email: "during@example.com" }),
    delay(1500).then(() => { throw new Error("Email request remained pending"); }),
  ]), /enableOfflineQueue|Stream isn't writeable/);

  redis = await startRedis(port);
  while (client.status !== "ready") await delay(20);
  const recovered = await queue.add("send-email", { email: "after@example.com" });
  assert.ok(recovered.id);
  assert.equal(await queue.getWaitingCount(), 1);
});
