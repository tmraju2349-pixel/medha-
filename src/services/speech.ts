export function speak(txt: string, langSetting: string = 'en', voiceEnabled: boolean = true, rate: number = 0.9): void {
  if (!voiceEnabled) return;
  try {
    const u = new SpeechSynthesisUtterance(txt);
    const langMap: Record<string, string> = {
      en: 'en-IN',
      as: 'hi-IN', // fallback for Assamese TTS in browsers that lack as-IN
      bn: 'bn-IN',
      hi: 'hi-IN',
    };
    u.lang = langMap[langSetting] || 'en-IN';
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn('SpeechSynthesis error:', e);
  }
}
