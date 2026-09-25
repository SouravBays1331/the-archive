import { z } from 'zod';

// Technique glyph ids — must match the glyph set in lib/glyphs.tsx
export const TECHNIQUES = [
  'agents',
  'retrieval',
  'simulation',
  'forecasting',
  'signal',
  'language',
  'vision',
  'optimisation',
] as const;

export const DOMAINS = ['finance', 'operations', 'simulation', 'growth', 'risk', 'infra'] as const;
export const OBJECT_TYPES = ['hardcover', 'binder', 'dossier', 'notebook', 'boxed'] as const;

export const techniqueSchema = z.enum(TECHNIQUES);
export const domainSchema = z.enum(DOMAINS);
export const objectTypeSchema = z.enum(OBJECT_TYPES);

const stageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  agent: z.boolean().optional(),
  captionExec: z.string().min(1),
  captionTech: z.string().min(1).optional(),
});

const blueprintItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  kind: z.enum(['component', 'store', 'model', 'guard', 'orchestration']).optional(),
});

const partSchema = z.object({
  component: z.string().min(1),
  role: z.string().min(1),
  family: z.string().min(1),
});

const metricSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  sourceNote: z.string().min(1), // internal only, never rendered
});

const roiInputSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  default: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
});

export const volumeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  codename: z.string().regex(/^[A-Za-z][A-Za-z0-9]{2,31}$/),
  objectType: objectTypeSchema,
  domain: domainSchema,
  sectorTag: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  status: z.enum(['delivered', 'in-progress']),
  complexity: z.number().int().min(1).max(5),
  impactTier: z.number().int().min(1).max(3),
  techniques: z.array(techniqueSchema).min(1).max(3),
  hook: z.string().min(1),
  tier: z.enum(['guest', 'partner']),

  problem: z.object({
    statementExec: z.string().min(1),
    statementTech: z.string().min(1).optional(),
    painPoints: z.array(z.string().min(1)).min(1).max(3),
    marginNotes: z.array(z.string().min(1)).max(4).optional(),
  }),

  approach: z.object({
    summaryExec: z.string().min(1),
    stages: z.array(stageSchema).min(2).max(6),
    edges: z.array(z.tuple([z.string(), z.string()])),
  }),

  engine: z
    .object({
      blueprint: z.array(blueprintItemSchema).min(2),
      parts: z.array(partSchema).min(2),
      evaluation: z.string().min(1),
    })
    .optional(),

  value: z.object({
    before: z.string().min(1),
    after: z.string().min(1),
    metrics: z.array(metricSchema).min(1).max(4),
  }),

  roi: z
    .object({
      inputs: z.array(roiInputSchema).min(2).max(5),
      formula: z.string().min(1),
      outputs: z.array(z.string().min(1)).min(1).max(2),
      footnote: z.string().min(1).optional(),
    })
    .optional(),

  related: z.array(z.string()).max(3),
  cta: z.object({ variant: z.enum(['demo', 'pilot', 'partnership', 'explore']) }),
});

export type Volume = z.infer<typeof volumeSchema>;
export type Stage = z.infer<typeof stageSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type RoiInput = z.infer<typeof roiInputSchema>;
