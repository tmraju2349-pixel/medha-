import { GameSession } from '../../types/medha';
import { localRepository } from '../storage/localRepository';
import { syncManager } from '../storage/syncManager';

export const gameSessionService = {
  completeSession(sessionData: Omit<GameSession, 'sessionId' | 'completed' | 'completedAt'>) {
    const session: GameSession = {
      ...sessionData,
      sessionId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      completed: true,
      completedAt: Date.now()
    };

    // 1. Save locally immediately & create queue entry
    localRepository.saveGameSession(session);

    // 2. Update DB game levels, logs, and cognitive day scores
    const db = localRepository.getDB();
    if (db) {
      if (!db.levels) db.levels = { match: 2, seq: 2, odd: 2, pairs: 1, treasure: 1, talk: 1 };
      db.levels[session.gameId] = session.difficulty;

      if (!db.gameLog) db.gameLog = [];
      db.gameLog.unshift({
        game: session.gameId,
        score: session.score,
        ts: Date.now(),
      });
      if (db.gameLog.length > 50) db.gameLog.pop();

      // Update cognitive day scores if available
      if (db.scores && db.scores.length > 0) {
        const lastScore = db.scores[db.scores.length - 1];
        const domains = session.cognitiveDomains || [];
        const isSpeed = domains.includes('speed') || domains.includes('attention');
        const isMemory = domains.includes('memory');

        // Derive updated metrics
        const speedScore = Math.min(100, Math.max(30, Math.round(110 - (session.averageReactionTime * 100))));
        if (isSpeed) {
          lastScore.speed = Math.round((lastScore.speed * 0.7) + (speedScore * 0.3));
          lastScore.attention = Math.round((lastScore.attention * 0.7) + (session.score * 0.3));
        }
        if (isMemory) {
          lastScore.memory = Math.round((lastScore.memory * 0.7) + (session.score * 0.3));
        }
      }

      localRepository.saveDB(db);
    }

    // 3. Trigger sync process
    syncManager.triggerSync();

    return session;
  }
};
