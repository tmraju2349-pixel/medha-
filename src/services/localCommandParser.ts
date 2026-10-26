/**
 * Local Command Parser for MEDHA Voice Assistant (Offline Mode)
 * Executes instantly without external API calls or network access.
 */

export interface ParsedVoiceCommand {
  action: 'answer' | 'navigate' | 'search_tree' | 'read_screen' | 'hydrate' | 'sos' | 'reminder' | 'memory' | 'diary' | 'unknown';
  originalText: string;
  detectedLanguage: string;
  confirmationPrompt?: string;
  answer?: string;
  payload?: any;
}

export function parseOfflineVoiceCommand(
  rawTranscript: string,
  currentPage: string = 'home'
): ParsedVoiceCommand {
  const text = (rawTranscript || '').trim().toLowerCase();

  // 1. Emergency SOS
  if (
    text.includes('sos') ||
    text.includes('emergency') ||
    text.includes('help me') ||
    text.includes('save me') ||
    text.includes('বচাওঁ') ||
    text.includes('মোক বচাওঁক') ||
    text.includes('বাঁচাও') ||
    text.includes('मदद') ||
    text.includes('बचाओ')
  ) {
    return {
      action: 'sos',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Trigger an emergency SOS alert to your caregiver Pooja?',
      payload: { reason: 'Voice emergency trigger' },
    };
  }

  // 2. Read Screen
  if (
    text.includes('read screen') ||
    text.includes('screen reading') ||
    text.includes('read to me') ||
    text.includes('read this') ||
    text.includes('what is on screen') ||
    text.includes('পঢ়ি শুনাও') ||
    text.includes('পঢ়ি শুনাওক') ||
    text.includes('পড়ে শোনাও') ||
    text.includes('यह पढ़ो') ||
    text.includes('स्क्रीन पढ़ो')
  ) {
    return {
      action: 'read_screen',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Read the text and status on this screen aloud?',
      payload: { currentPage },
    };
  }

  // 3. Hydration
  if (
    text.includes('drink water') ||
    text.includes('drank water') ||
    text.includes('had water') ||
    text.includes('glass of water') ||
    text.includes('water logged') ||
    text.includes('পানী খালোঁ') ||
    text.includes('পানী খালো') ||
    text.includes('জল খেলাম') ||
    text.includes('पानी पिया') ||
    text.includes('पानी पी लिया')
  ) {
    return {
      action: 'hydrate',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Log a glass of drinking water for your daily goal?',
      payload: {},
    };
  }

  // 4. Combined: Open Tree and Search (e.g. "open trees and search for pets", "open tree search pets")
  const treeSearchMatch = text.match(/(?:open\s+(?:trees?|memory\s*trees?)\s+and\s+search\s+(?:for\s+)?|search\s+(?:for\s+)?)([\w\s]+?)(?:\s+in\s+(?:trees?|memory))?$/i);
  if (
    (text.includes('tree') || text.includes('trees') || text.includes('গছ') || text.includes('গাছ') || text.includes('वृक्ष')) &&
    (text.includes('search') || text.includes('find') || text.includes('pets') || text.includes('সন্ধান') || text.includes('ढूंढो'))
  ) {
    let query = 'pets';
    if (text.includes('pet') || text.includes('dog') || text.includes('cat') || text.includes('bruno') || text.includes('জন্তু')) {
      query = 'pets';
    } else if (text.includes('family') || text.includes('pooja') || text.includes('moloi') || text.includes('পৰিয়াল')) {
      query = 'family';
    } else if (text.includes('place') || text.includes('home') || text.includes('থাই')) {
      query = 'places';
    }
    return {
      action: 'search_tree',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: `Open your Memory Tree and search for "${query}"?`,
      payload: { page: 'tree', query },
    };
  }

  // 5. Search Tree directly (e.g., "search pets", "search for bruno")
  if (text.startsWith('search for ') || text.startsWith('search ') || text.startsWith('find ')) {
    const query = text.replace(/^(?:search\s+for|search|find)\s+/i, '').trim();
    return {
      action: 'search_tree',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: `Search your Memory Tree for "${query}"?`,
      payload: { page: 'tree', query },
    };
  }

  // 6. Navigation
  if (
    text.includes('open tree') ||
    text.includes('open trees') ||
    text.includes('memory tree') ||
    text.includes('my tree') ||
    text.includes('trees') ||
    text.includes('গছ খোল') ||
    text.includes('স্মৃতিৰ গছ') ||
    text.includes('গাছ খোল') ||
    text.includes('पेड़ खोलो') ||
    text.includes('स्मृति वृक्ष')
  ) {
    return {
      action: 'navigate',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Open your Memory Tree module?',
      payload: { page: 'tree' },
    };
  }

  if (
    text.includes('open home') ||
    text.includes('go home') ||
    text.includes('home screen') ||
    text.includes('routine') ||
    text.includes('tasks') ||
    text.includes('ঘৰলৈ যোৱা') ||
    text.includes('বাড়ি চলো') ||
    text.includes('घर चलो')
  ) {
    return {
      action: 'navigate',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Go to your Home screen?',
      payload: { page: 'home' },
    };
  }

  if (
    text.includes('open games') ||
    text.includes('brain games') ||
    text.includes('play games') ||
    text.includes('brain gym') ||
    text.includes('মগজুৰ খেল') ||
    text.includes('খেলা') ||
    text.includes('खेल खोलो')
  ) {
    return {
      action: 'navigate',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Open the Brain Games module?',
      payload: { page: 'games' },
    };
  }

  if (
    text.includes('open diary') ||
    text.includes('voice diary') ||
    text.includes('my diary') ||
    text.includes('journal') ||
    text.includes('কণ্ঠ ডায়েৰী') ||
    text.includes('डायरी खोलो')
  ) {
    return {
      action: 'navigate',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Open your Voice Diary module?',
      payload: { page: 'diary' },
    };
  }

  if (
    text.includes('open map') ||
    text.includes('safe zones') ||
    text.includes('where am i') ||
    text.includes('guardian') ||
    text.includes('geofence') ||
    text.includes('ৰক্ষক') ||
    text.includes('মানচিত্ৰ') ||
    text.includes('नक्शा खोलो')
  ) {
    return {
      action: 'navigate',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Open the Guardian Safe Zone Map?',
      payload: { page: 'geo' },
    };
  }

  if (text.includes('open settings') || text.includes('settings') || text.includes('ছেটিং') || text.includes('सेटिंग्स')) {
    return {
      action: 'navigate',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: 'Open your Settings view?',
      payload: { page: 'settings' },
    };
  }

  // 7. Add Reminder
  if (
    text.includes('remind me') ||
    text.includes('reminder') ||
    text.includes('monot pelaba') ||
    text.includes('মনত পেলাবা') ||
    text.includes('মনে করিয়ে দিও') ||
    text.includes('याद दिलाना')
  ) {
    let clean = rawTranscript.replace(/^(?:please\s+)?(?:remind\s+me(?:\s+to)?|set\s+a\s+reminder(?:\s+to)?|মনত\s+পেলাবা|याद\s+दिलाना)\s*/i, '');
    let time = '17:00';
    const timeMatch = clean.match(/(?:at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (timeMatch) {
      time = formatTimeString(timeMatch[1]);
      clean = clean.replace(timeMatch[0], '').trim();
    }
    const title = clean || 'Reminder';
    return {
      action: 'reminder',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: `Add "${title}" to your routine at ${time}?`,
      payload: { title, time },
    };
  }

  // 8. Add Memory to Memory Tree
  if (
    text.includes('remember') ||
    text.includes('save memory') ||
    text.includes('new memory') ||
    text.includes('add memory') ||
    text.includes('স্মৃতি') ||
    text.includes('মনে রাখো') ||
    text.includes('याद रखो')
  ) {
    let memoryText = rawTranscript.replace(/^(?:please\s+)?(?:remember(?:\s+that)?|save\s+memory|add\s+memory|স্মৃতি|याद\s+रखो)\s*/i, '').trim();
    return {
      action: 'memory',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: `Add this story to your Memory Tree: "${memoryText}"?`,
      payload: {
        title: memoryText.slice(0, 40) + (memoryText.length > 40 ? '…' : ''),
        description: memoryText,
        importance: 'medium',
      },
    };
  }

  // 9. Diary Entry
  if (text.startsWith('dear diary') || text.startsWith('diary') || text.includes('write in diary') || text.includes('ডায়েৰী লিখা')) {
    const entry = rawTranscript.replace(/^(?:dear\s+)?diary(?:\s*:)?\s*/i, '').trim();
    return {
      action: 'diary',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      confirmationPrompt: `Save this entry to your Voice Diary: "${entry}"?`,
      payload: { text: entry },
    };
  }

  // 10. General Questions & Knowledge (e.g., "tell me about Nepal floods", "what is...")
  if (
    text.startsWith('tell me') ||
    text.startsWith('what is') ||
    text.startsWith('who is') ||
    text.startsWith('explain') ||
    text.startsWith('how') ||
    text.includes('floods') ||
    text.includes('flood') ||
    text.includes('বন্যা') ||
    text.includes('বানপানী') ||
    text.includes('बाढ़')
  ) {
    let answer = `You are currently in offline mode. For real-time updates and full details about "${rawTranscript}", toggle Online mode (Gemini AI) on!`;
    if (text.includes('nepal')) {
      answer = 'Nepal experienced heavy monsoon downpours leading to devastating flash floods and landslides across Kathmandu valley and eastern regions. Rivers breached danger marks, affecting highways and communities.';
    }
    return {
      action: 'answer',
      originalText: rawTranscript,
      detectedLanguage: detectLanguage(rawTranscript),
      answer,
      payload: { query: rawTranscript },
    };
  }

  // Default fallback: treat as memory creation prompt or search prompt
  return {
    action: 'memory',
    originalText: rawTranscript,
    detectedLanguage: detectLanguage(rawTranscript),
    confirmationPrompt: `Record this into your Memory Tree: "${rawTranscript}"?`,
    payload: {
      title: rawTranscript.slice(0, 40),
      description: rawTranscript,
    },
  };
}

function detectLanguage(text: string): string {
  if (/[\u0980-\u09FF]/.test(text)) {
    // Assamese/Bengali script
    return 'অসমীয়া / বাংলা';
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return 'हिन्दी (Hindi)';
  }
  return 'English';
}

function formatTimeString(rawTime: string): string {
  const clean = rawTime.trim().toLowerCase();
  const match = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return '17:00';
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? match[2] : '00';
  const ampm = match[3];

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

export function generateScreenSummary(
  currentPage: string,
  contextData: {
    tasksCount: number;
    uncompletedTasks: number;
    hydrationCount: number;
    hydrationGoal: number;
    patientName: string;
    safeZonesCount: number;
    memoriesCount: number;
  }
): string {
  switch (currentPage) {
    case 'home':
      return `Good day, ${contextData.patientName}! You are currently on the Home view. You have ${contextData.uncompletedTasks} tasks remaining out of ${contextData.tasksCount} today. You have drank ${contextData.hydrationCount} of ${contextData.hydrationGoal} glasses of water.`;
    case 'tree':
    case 'book':
      return `You are in your Memory Tree. It displays your personal root, family branches, pets, places, and treasured life memories. You can tap on any branch to expand it or tap the microphone to search memories.`;
    case 'diary':
      return `You are in your Voice Diary. You can record your daily voice notes, listen to past recordings, and save thoughts in Assamese, Bengali, Hindi, or English.`;
    case 'games':
      return `You are in Brain Games. Daily games include Memory Match, Odd One Out, Picture Sequence, Sound Pairs, and Story Treasure to keep your cognition agile.`;
    case 'geo':
      return `You are in the Guardian Geofencing map. There are ${contextData.safeZonesCount} safe zones marked, including Home, Temple, and the Park. Your location is being monitored safely.`;
    case 'settings':
      return `You are in Settings. Here you can adjust font size, toggle high-contrast display, switch language, and configure voice playback speed.`;
    default:
      return `You are using MEDHA cognitive assistant.`;
  }
}
