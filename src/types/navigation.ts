export type TabType = 'home' | 'alert' | 'songs' | 'money';

export interface NavItemConfig {
  id: TabType;
  label: string;
  iconSrc?: string;
  description?: string;
}
