// Accuracy coefficient: estimated ÷ actual time
// 1.0 = perfect; <1.0 = underestimation (common in ADHD); >1.0 = overestimation
// Per Marx et al. (2021) — more reliable than absolute error
export function accuracyCoefficient(estimatedMs, actualMs) {
  if (actualMs === 0) return null;
  return Math.round((estimatedMs / actualMs) * 100) / 100;
}

// Qualitative label for feedback
export function accuracyLabel(coeff) {
  if (coeff === null) return 'Error';
  const diff = Math.abs(1 - coeff);
  if (diff <= 0.05) return 'Perfect';
  if (diff <= 0.15) return 'Very close';
  if (diff <= 0.25) return 'Getting there';
  if (diff <= 0.40) return 'Keep practicing';
  return 'Way off — that\'s okay, it takes time';
}

// Trend: is accuracy improving over last N sessions?
export function accuracyTrend(coefficients) {
  if (coefficients.length < 3) return null;
  const recent = coefficients.slice(-3);
  const distances = recent.map(c => Math.abs(1 - c));
  const improving = distances[2] < distances[0];
  const pctImprovement = Math.round(((distances[0] - distances[2]) / distances[0]) * 100);
  return { improving, pctImprovement };
}

// Average accuracy over last N sessions
export function avgAccuracy(coefficients, n = 5) {
  const slice = coefficients.slice(-n);
  if (slice.length === 0) return null;
  return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
}
