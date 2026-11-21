export async function register() {
  // mysql2 does not run on the Edge runtime, so start jobs only on Node.js.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startJobs } = await import('./lib/jobs');
    startJobs();
  }
}
