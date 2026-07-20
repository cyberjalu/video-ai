#!/usr/bin/env tsx
import { cleanupExpiredJobs } from "../src/server/jobs/cleanup";
import { reapStuckJobs } from "../src/server/jobs/store";

const removed = await cleanupExpiredJobs();
const reaped = await reapStuckJobs();
console.log(JSON.stringify({ removed, reaped, at: new Date().toISOString() }));
