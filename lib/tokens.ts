// Domain → accent token map (client-safe mirror of the CSS custom properties).
export const DOMAIN_ACCENT: Record<string, string> = {
  finance: 'var(--acc-finance)',
  operations: 'var(--acc-operations)',
  simulation: 'var(--acc-simulation)',
  growth: 'var(--acc-growth)',
  risk: 'var(--acc-risk)',
  infra: 'var(--acc-infra)',
};

export const DOMAIN_LABEL: Record<string, string> = {
  finance: 'Finance',
  operations: 'Operations',
  simulation: 'Simulation',
  growth: 'Growth',
  risk: 'Risk',
  infra: 'Infrastructure',
};

export function accentFor(domain: string): string {
  return DOMAIN_ACCENT[domain] ?? 'var(--lamp)';
}
