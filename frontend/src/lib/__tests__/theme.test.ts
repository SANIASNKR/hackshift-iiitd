/**
 * AyuStream AI — Clinical Theme & Triage Tokens Test Suite
 * Tests critical threshold evaluators for emergency heart rate, SpO2, blood pressure, and GCS.
 */

import {
  evaluateHeartRate,
  evaluateSpO2,
  evaluateBloodPressure,
  evaluateGCS,
  formatETA,
  formatDistanceKm,
  TRIAGE_TOKENS,
  AMBULANCE_STATUS_TOKENS,
} from '../theme';

export function runThemeTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      passed++;
      results.push(`✓ PASS: ${testName}`);
    } else {
      failed++;
      results.push(`✗ FAIL: ${testName}`);
    }
  };

  // Heart Rate Tests
  assert(evaluateHeartRate(40).status === 'critical', 'HR 40 evaluates to critical (Severe Bradycardia)');
  assert(evaluateHeartRate(55).status === 'warning', 'HR 55 evaluates to warning (Mild Bradycardia)');
  assert(evaluateHeartRate(75).status === 'normal', 'HR 75 evaluates to normal (Eucardia)');
  assert(evaluateHeartRate(110).status === 'warning', 'HR 110 evaluates to warning (Tachycardia)');
  assert(evaluateHeartRate(155).status === 'critical', 'HR 155 evaluates to critical (Severe Tachycardia)');

  // SpO2 Tests
  assert(evaluateSpO2(85).status === 'critical', 'SpO2 85% evaluates to critical (Critical Hypoxemia)');
  assert(evaluateSpO2(92).status === 'warning', 'SpO2 92% evaluates to warning (Mild Hypoxia)');
  assert(evaluateSpO2(99).status === 'normal', 'SpO2 99% evaluates to normal');

  // Blood Pressure Tests
  assert(evaluateBloodPressure(70, 45).status === 'critical', 'BP 70/45 evaluates to critical (Hypotensive Shock)');
  assert(evaluateBloodPressure(120, 80).status === 'normal', 'BP 120/80 evaluates to normal (Normotensive)');
  assert(evaluateBloodPressure(195, 115).status === 'critical', 'BP 195/115 evaluates to critical (Hypertensive Crisis)');

  // GCS Tests
  assert(evaluateGCS(6).status === 'critical', 'GCS 6 evaluates to critical (Severe Coma / Airway Alert)');
  assert(evaluateGCS(11).status === 'warning', 'GCS 11 evaluates to warning (Altered Mental Status)');
  assert(evaluateGCS(15).status === 'normal', 'GCS 15 evaluates to normal (Alert & Oriented)');

  // Formatting Tests
  assert(formatETA(0.5) === '< 1 min', 'formatETA(0.5) renders "< 1 min"');
  assert(formatETA(12) === '12 mins', 'formatETA(12) renders "12 mins"');
  assert(formatETA(75) === '1h 15m', 'formatETA(75) renders "1h 15m"');
  assert(formatDistanceKm(0.4) === '400 m', 'formatDistanceKm(0.4) renders "400 m"');
  assert(formatDistanceKm(4.25) === '4.3 km', 'formatDistanceKm(4.25) renders "4.3 km"');

  // Triage Tokens Verification
  assert(Boolean(TRIAGE_TOKENS.CRITICAL.badgeBg), 'TRIAGE_TOKENS.CRITICAL has badgeBg');
  assert(Boolean(AMBULANCE_STATUS_TOKENS.TRANSPORTING.dot), 'AMBULANCE_STATUS_TOKENS.TRANSPORTING has pulse dot');

  return { passed, failed, results };
}

// Auto-run if executed directly in test runner
const globalObj = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : {};
const nodeProcess = globalObj.process as { exit?: (code: number) => void } | undefined;
if (typeof window === 'undefined' && nodeProcess) {
  const summary = runThemeTests();
  console.log(`Ran ${summary.passed + summary.failed} theme tests: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0 && nodeProcess.exit) {
    nodeProcess.exit(1);
  }
}
