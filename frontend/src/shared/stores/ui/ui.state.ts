/**
 * UI State
 * 
 * Global UI state (toasts, modals, loading, etc.)
 */

export interface Toast {
  id: string;
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail: string;
  life?: number;
}

export interface UIState {
  loading: boolean;
  toasts: Toast[];
  sidebarOpen: boolean;
}

export const initialUIState: UIState = {
  loading: false,
  toasts: [],
  sidebarOpen: true
};

