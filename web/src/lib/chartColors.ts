// the globals.css tokens a canvas draws with, since echarts cannot read css variables
export const ACCENT = '#0891b2'
export const ACCENT_SOFT = '#c4e5ed'
export const GRAY = '#9aa1ad'
export const GREEN = '#4caf50'
export const SUPPORT = '#7c3aed'

// a token colour mixed into white, solid so grid lines stay behind the bars
export const tint = (hex: string, share: number) => `#${[1, 3, 5].map(i => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * share).toString(16).padStart(2, '0')).join('')}`
