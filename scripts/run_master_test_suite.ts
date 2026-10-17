import { execSync } from 'child_process';

interface PhaseResult {
  phase: string;
  name: string;
  passed: boolean;
  durationMs: number;
  output: string;
}

const phases = [
  { phase: 'Phase 1', name: 'Foundation: Events & Feature Flags & Kill Switches', script: 'scripts/run_phase1_tests.mjs', cmd: 'npx --yes tsx scripts/run_phase1_tests.mjs' },
  { phase: 'Phase 2', name: 'Monetization: Promo Codes & Live Pricing Engine', script: 'scripts/test_phase2.ts', cmd: 'npx --yes tsx scripts/test_phase2.ts' },
  { phase: 'Phase 3', name: 'Engagement: In-App Notifications, Drops & Dynamic Banners', script: 'scripts/test_phase3.ts', cmd: 'npx --yes tsx scripts/test_phase3.ts' },
  { phase: 'Phase 4', name: 'Intelligence: Telemetry, Companion Ranking & Calendar', script: 'scripts/test_phase4.ts', cmd: 'npx --yes tsx scripts/test_phase4.ts' },
  { phase: 'Phase 5', name: 'Governance: Multi-Admin RBAC, Audit Logs & Anti-Abuse', script: 'scripts/test_phase5.ts', cmd: 'npx --yes tsx scripts/test_phase5.ts' },
  { phase: 'Phase 6', name: 'Production Launch: Edge CDN, PWA & Disaster Recovery', script: 'scripts/test_phase6.ts', cmd: 'npx --yes tsx scripts/test_phase6.ts' },
];

async function runMasterSuite() {
  console.log('======================================================================');
  console.log('👑 ZOVIK AI ADMIN MASTER PLAN - FULL SYSTEM A-to-Z VERIFICATION SUITE');
  console.log('======================================================================\n');

  const results: PhaseResult[] = [];
  let totalStartTime = Date.now();

  for (const p of phases) {
    const startTime = Date.now();
    process.stdout.write(`⏳ Executing ${p.phase} (${p.name})... `);
    try {
      const output = execSync(p.cmd, { stdio: 'pipe', encoding: 'utf-8', timeout: 60000 });
      const durationMs = Date.now() - startTime;
      results.push({ phase: p.phase, name: p.name, passed: true, durationMs, output });
      console.log(`✅ PASSED (${(durationMs / 1000).toFixed(1)}s)`);
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorOutput = err.stdout || err.stderr || err.message;
      results.push({ phase: p.phase, name: p.name, passed: false, durationMs, output: errorOutput });
      console.log(`❌ FAILED (${(durationMs / 1000).toFixed(1)}s)`);
      console.error(errorOutput);
    }
  }

  const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(1);
  const allPassed = results.every(r => r.passed);

  console.log('\n======================================================================');
  console.log('🏁 GRAND MASTER PLAN RESULTS SUMMARY');
  console.log('======================================================================');
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.phase}: ${r.name.padEnd(55)} [${(r.durationMs / 1000).toFixed(1)}s]`);
  }
  console.log('----------------------------------------------------------------------');
  console.log(`Total Execution Time: ${totalDuration}s`);
  console.log(`Overall Health: ${allPassed ? '🌟 100% SUCCESS - ALL 6 PHASES PASSED' : '⚠️ SOME TESTS FAILED'}`);
  console.log('======================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runMasterSuite().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
