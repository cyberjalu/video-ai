#!/usr/bin/env tsx
import { cleanupExpiredJobs } from "../src/server/jobs/cleanup.js";

const removed = await cleanupExpiredJobs();
console.log(`Removed ${removed} expired job(s).`);
