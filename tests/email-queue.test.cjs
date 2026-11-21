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

function loadModule(file, env, loadDependency) {
  const source = readFileSync(path.join(__dirname, "../src", file), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    process: { env },
    console: { error() {} },
    require: loadDependency,
  });
  return exports;
}

function loadQueue(port) {
  const env = { REDIS_HOST: "127.0.0.1", REDIS_PORT: String(port) };
  const config = loadModule("redisConnection.ts", env, (name) => {
    assert.equal(name, "dotenv/config");
    return {};
  });
  assert.equal(config.redisConnection.port, port);
  return loadModule("queues/emailQueue.ts", env, (name) => {
    if (name === "../redisConnection") return config;
    assert.equal(name, "bullmq");
    return { Queue };
  });
}

test("email producer rejects before Redis starts and during outages, then recovers", {
  timeout: 15000,
  skip: spawnSync("redis-server", ["--version"]).status !== 0
    ? "Install redis-server to run the queue integration test"
    : false,
}, async (t) => {
  const port = await freePort();
  let redis;
  const { emailQueue: queue, enqueueEmail } = loadQueue(port);
  t.after(async () => {
    try {
      await queue.close();
    } finally {
      await stopRedis(redis);
    }
  });
  await assert.rejects(enqueueEmail("startup@example.com"), /queue is not ready/);
  assert.doesNotThrow(() => queue.emit("error", new Error("Redis unavailable")));
  redis = await startRedis(port);
  const client = await queue.waitUntilReady();
  const job = await enqueueEmail("before@example.com");
  assert.ok(job.id);

  const disconnected = new Promise((resolve) => queue.once("ioredis:close", resolve));
  await stopRedis(redis);
  await disconnected;
  await assert.rejects(Promise.race([
    enqueueEmail("during@example.com"),
    delay(1500).then(() => { throw new Error("Email request remained pending"); }),
  ]), /enableOfflineQueue|Stream isn't writeable/);

  redis = await startRedis(port);
  while (client.status !== "ready") await delay(20);
  const recovered = await enqueueEmail("after@example.com");
  assert.ok(recovered.id);
  assert.equal(await queue.getWaitingCount(), 1);
});
