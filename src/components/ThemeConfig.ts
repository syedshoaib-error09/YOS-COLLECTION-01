import type { ColorTheme, StampDesign } from '../types';

export interface ThemeTokens {
  id: ColorTheme;
  label: string;
  shortLabel: string;
  isDarkPage: boolean;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardMuted: string;
  slotEmptyBorder: string;
  slotEmptyBg: string;
  slotEmptyText: string;
  slotFilledBg: string;
  slotFilledBorder: string;
  stampInk: string;
  stampAccent: string;
  progressTrack: string;
  progressFill: string;
  ctaBg: string;
  ctaText: string;
}

export const THEME_OPTIONS: Record<ColorTheme, ThemeTokens> = {
  'obsidian-gold': {
    id: 'obsidian-gold',
    label: 'Obsidian Black & Gold',
    shortLabel: 'Obsidian',
    isDarkPage: true,
    cardBg: 'bg-gradient-to-br from-[#141418] via-[#0B0B0E] to-[#191610]',
    cardBorder: 'border-[#C9A34E]/45',
    cardText: 'text-[#FAF8F4]',
    cardMuted: 'text-[#A8A298]',
    slotEmptyBorder: 'border-[#C9A34E]/35',
    slotEmptyBg: 'bg-white/[0.03]',
    slotEmptyText: 'text-[#8D8576]',
    slotFilledBg: 'bg-gradient-to-br from-[#231D12] to-[#13100A]',
    slotFilledBorder: 'border-[#D4AF37]',
    stampInk: '#E3C168',
    stampAccent: '#FAF8F4',
    progressTrack: 'bg-white/10',
    progressFill: 'bg-gradient-to-r from-[#B89038] via-[#E3C168] to-[#C9A34E]',
    ctaBg: 'bg-gradient-to-r from-[#C9A34E] via-[#DFBE68] to-[#B89038] hover:brightness-105',
    ctaText: 'text-[#0B0B0E]',
  },
  'ivory-gold': {
    id: 'ivory-gold',
    label: 'Pure White & Gold',
    shortLabel: 'Ivory White',
    isDarkPage: false,
    cardBg: 'bg-gradient-to-br from-[#FFFFFF] via-[#FAF8F3] to-[#F3EFE6]',
    cardBorder: 'border-[#C5A049]/50',
    cardText: 'text-[#111114]',
    cardMuted: 'text-[#676158]',
    slotEmptyBorder: 'border-[#111114]/20',
    slotEmptyBg: 'bg-[#111114]/[0.02]',
    slotEmptyText: 'text-[#8B847A]',
    slotFilledBg: 'bg-gradient-to-br from-[#16161A] to-[#0B0B0E]',
    slotFilledBorder: 'border-[#B89038]',
    stampInk: '#E3C168',
    stampAccent: '#FFFFFF',
    progressTrack: 'bg-[#111114]/10',
    progressFill: 'bg-gradient-to-r from-[#111114] via-[#B89038] to-[#D4AF37]',
    ctaBg: 'bg-[#111114] hover:bg-[#232329]',
    ctaText: 'text-[#FAF8F3]',
  },
  'champagne-noir': {
    id: 'champagne-noir',
    label: 'Champagne Gold & Noir',
    shortLabel: 'Gold Atelier',
    isDarkPage: false,
    cardBg: 'bg-gradient-to-br from-[#D7B668] via-[#C59E45] to-[#A8822D]',
    cardBorder: 'border-[#111114]/25',
    cardText: 'text-[#0E0E11]',
    cardMuted: 'text-[#2D2618]',
    slotEmptyBorder: 'border-[#0E0E11]/30',
    slotEmptyBg: 'bg-white/20',
    slotEmptyText: 'text-[#3A311F]',
    slotFilledBg: 'bg-[#0E0E11]',
    slotFilledBorder: 'border-[#FAF8F3]/80',
    stampInk: '#E3C168',
    stampAccent: '#FAF8F3',
    progressTrack: 'bg-[#0E0E11]/15',
    progressFill: 'bg-[#0E0E11]',
    ctaBg: 'bg-[#0E0E11] hover:bg-[#1E1E24]',
    ctaText: 'text-[#E8CB7D]',
  },
};

export const STAMP_DESIGN_OPTIONS: Array<{ id: StampDesign; label: string; description: string }> = [
  { id: 'monogram', label: 'Monogram Seal', description: 'Octagonal YOS signature crest' },
  { id: 'crown', label: 'Crown Crest', description: 'Atelier sovereign crown emblem' },
  { id: 'diamond', label: 'Diamond Atelier', description: 'Faceted geometric jewel mark' },
  { id: 'laurel', label: 'Laurel Emblem', description: 'Botanical wreath around YOS seal' },
];
