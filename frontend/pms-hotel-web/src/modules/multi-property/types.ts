export type MultiPropertyView = 'dashboard' | 'search' | 'results' | 'evaluate' | 'applied';

export interface ViewProps {
  onNavigate: (view: MultiPropertyView) => void;
}
