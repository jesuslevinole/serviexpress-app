import { useContext } from 'react';
import { UiConfigContext, type UiConfigContextValue } from '../context/uiConfigContext';

export function useUiConfig(): UiConfigContextValue {
  const context = useContext(UiConfigContext);
  if (!context) {
    throw new Error('useUiConfig must be used inside <UiConfigProvider>');
  }
  return context;
}
