import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/src/theme';

const styleId = 'gyn-flow-input-reset';

export function WebInputStyleReset() {
  const { theme } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    let style = document.getElementById(styleId);

    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      input,
      textarea {
        outline: none !important;
        background-color: transparent !important;
        color: ${theme.text.primary} !important;
        caret-color: ${theme.accent.primary} !important;
      }

      input:focus,
      textarea:focus {
        outline: none !important;
        background-color: transparent !important;
      }

      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      textarea:-webkit-autofill,
      textarea:-webkit-autofill:hover,
      textarea:-webkit-autofill:focus {
        -webkit-text-fill-color: ${theme.text.primary} !important;
        box-shadow: 0 0 0 1000px ${theme.bg.surface} inset !important;
        caret-color: ${theme.accent.primary} !important;
        transition: background-color 9999s ease-out 0s !important;
      }
    `;
  }, [theme]);

  return null;
}
