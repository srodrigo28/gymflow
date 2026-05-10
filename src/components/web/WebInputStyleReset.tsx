import { useEffect } from 'react';
import { Platform } from 'react-native';

import { colors } from '@/src/constants/colors';

const styleId = 'gym-flow-input-reset';

export function WebInputStyleReset() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input,
      textarea {
        outline: none !important;
        background-color: transparent !important;
        color: ${colors.text} !important;
        caret-color: ${colors.primary} !important;
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
        -webkit-text-fill-color: ${colors.text} !important;
        box-shadow: 0 0 0 1000px ${colors.backgroundSoft} inset !important;
        caret-color: ${colors.primary} !important;
        transition: background-color 9999s ease-out 0s !important;
      }
    `;

    document.head.appendChild(style);
  }, []);

  return null;
}
