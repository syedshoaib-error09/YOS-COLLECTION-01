export type ColorTheme = 'obsidian-gold' | 'ivory-gold' | 'champagne-noir';

export type StampDesign = 'monogram' | 'crown' | 'diamond' | 'laurel';

export interface LoyaltySettings {
  defaultTotalStamps: number;
  stampDesign: StampDesign;
  colorTheme: ColorTheme;
  rewardTitle: string;
  rewardSubtitle: string;
  brandTagline: string;
  pinConfiguredViaEnv: boolean;
}

export interface CustomerCard {
  id: number;
  cardCode: string;
  name: string;
  mobile: string;
  stampsCount: number;
  totalStamps: number;
  completedCycles: number;
  stampDesign: StampDesign | null;
  colorTheme: ColorTheme | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StampEvent {
  id: number;
  customerId: number;
  cycleNumber: number;
  slotNumber: number;
  eventType: 'STAMP_ADDED' | 'CYCLE_RESET' | 'CARD_ADJUSTED';
  note: string;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  actorRole: 'admin' | 'staff' | 'customer' | 'system';
  targetCustomerId: number | null;
  targetName: string | null;
  details: string;
  createdAt: string;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  brand: 'YOS COLLECTION';
  settings: Omit<LoyaltySettings, 'pinConfiguredViaEnv'>;
  customers: Array<{
    id: number;
    cardCode: string;
    name: string;
    mobile: string;
    stampsCount: number;
    totalStamps: number;
    completedCycles: number;
    stampDesign: StampDesign | null;
    colorTheme: ColorTheme | null;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
  stampHistory: Array<{
    id: number;
    customerId: number;
    cycleNumber: number;
    slotNumber: number;
    eventType: 'STAMP_ADDED' | 'CYCLE_RESET' | 'CARD_ADJUSTED';
    note: string;
    createdAt: string;
  }>;
  activityLogs: Array<{
    id: number;
    action: string;
    actorRole: 'admin' | 'staff' | 'customer' | 'system';
    targetCustomerId: number | null;
    targetName: string | null;
    details: string;
    createdAt: string;
  }>;
}
