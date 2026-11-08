// Safe Mobile Vibration Utility

export function vibrateLight() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(20);
    } catch (e) {}
  }
}

export function vibrateMedium() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(45);
    } catch (e) {}
  }
}

export function vibrateError() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([60, 40, 90]);
    } catch (e) {}
  }
}

export function vibrateWin() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40, 30, 40, 30, 80]);
    } catch (e) {}
  }
}
