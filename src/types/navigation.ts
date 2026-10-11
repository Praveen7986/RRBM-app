export type TabType = 'home' | 'alert' | 'songs' | 'blessings';

export interface NavItemConfig {
  id: TabType;
  label: string;
  iconSrc: string;
  fallbackIconSrc: string;
  description: string;
}
