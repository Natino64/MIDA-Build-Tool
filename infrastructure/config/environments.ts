export const stages = ['dev', 'nonprod', 'prod'] as const;

export type MidaStage = (typeof stages)[number];

export function stackNameFor(stage: MidaStage): string {
  return `mida-build-tool-${stage}`;
}
