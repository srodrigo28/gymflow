import { Alert, Platform, type AlertButton } from 'react-native';

// O Alert do React Native não faz nada no navegador. Lá, o aviso sem botão de cancelar vira window.alert e a
// pergunta com cancelar vira window.confirm (o "OK" segue a primeira ação); no celular, é o Alert de sempre.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((button) => button.style === 'cancel');
  const action = buttons?.find((button) => button.style !== 'cancel');

  if (!cancel) {
    window.alert(text);
    action?.onPress?.();
    return;
  }

  if (window.confirm(text)) {
    action?.onPress?.();
  } else {
    cancel.onPress?.();
  }
}
