/* Native Android speech bridge. In a normal browser this file intentionally does nothing. */
(() => {
  'use strict';
  const cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;
  if (typeof cap.registerPlugin !== 'function') return;
  try {
    window.NYVEXNativeSpeechRecognition = cap.registerPlugin('SpeechRecognition');
  } catch (error) {
    console.warn('[NYVEX] Native speech bridge could not initialize.', error);
  }
})();
