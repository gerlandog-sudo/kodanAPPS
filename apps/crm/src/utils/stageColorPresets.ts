export interface StageColorPreset {
  bg: string
  text: string
  border: string
  dot: string
}

export const STAGE_COLOR_PRESETS: Record<string, StageColorPreset> = {
  '#6366F1': { bg: 'rgba(99,102,241,0.12)', text: '#818CF8', border: '#6366F1', dot: '#6366F1' },
  '#8B5CF6': { bg: 'rgba(139,92,246,0.12)', text: '#A78BFA', border: '#8B5CF6', dot: '#8B5CF6' },
  '#EC4899': { bg: 'rgba(236,72,153,0.12)', text: '#F472B6', border: '#EC4899', dot: '#EC4899' },
  '#F43F5E': { bg: 'rgba(244,63,94,0.12)', text: '#FB7185', border: '#F43F5E', dot: '#F43F5E' },
  '#F97316': { bg: 'rgba(249,115,22,0.12)', text: '#FB923C', border: '#F97316', dot: '#F97316' },
  '#EAB308': { bg: 'rgba(234,179,8,0.12)', text: '#FACC15', border: '#EAB308', dot: '#EAB308' },
  '#22C55E': { bg: 'rgba(34,197,94,0.12)', text: '#4ADE80', border: '#22C55E', dot: '#22C55E' },
  '#14B8A6': { bg: 'rgba(20,184,166,0.12)', text: '#2DD4BF', border: '#14B8A6', dot: '#14B8A6' },
  '#06B6D4': { bg: 'rgba(6,182,212,0.12)', text: '#22D3EE', border: '#06B6D4', dot: '#06B6D4' },
  '#3B82F6': { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', border: '#3B82F6', dot: '#3B82F6' },
  '#6B7280': { bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF', border: '#6B7280', dot: '#6B7280' },
  '#1F2937': { bg: 'rgba(31,41,55,0.12)', text: '#4B5563', border: '#1F2937', dot: '#1F2937' },
}

export const STAGE_PRESET_LIST = Object.keys(STAGE_COLOR_PRESETS)

export function getStagePreset(colorHex: string): StageColorPreset {
  return STAGE_COLOR_PRESETS[colorHex] || {
    bg: 'rgba(99,102,241,0.12)',
    text: '#818CF8',
    border: '#6366F1',
    dot: '#6366F1',
  }
}
