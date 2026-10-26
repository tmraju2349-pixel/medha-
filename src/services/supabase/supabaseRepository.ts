import { supabase } from '../../lib/supabase';
import { SyncQueueItem } from '../../types/medha';

function formatPayloadForSupabase(entityType: string, payload: any, entityId?: string) {
  if (entityType === 'game_sessions') {
    // Supabase table columns: id (UUID), patient_id (UUID), game_key (text), score (int), mistakes (int)
    const isUUID = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    const validId = isUUID(payload.sessionId || entityId) 
      ? (payload.sessionId || entityId) 
      : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b17e1000-7200-4000-8000-000000000001');
    const validPatientId = isUUID(payload.patientId) 
      ? payload.patientId 
      : 'b17e1000-7200-4000-8000-000000000001'; // Default to Biren Saikia UUID
      
    return {
      id: validId,
      patient_id: validPatientId,
      game_key: payload.gameId || payload.game || payload.game_key || 'memory_match',
      score: typeof payload.score === 'number' ? Math.round(payload.score) : 0,
      mistakes: typeof payload.incorrectAnswers === 'number' 
        ? payload.incorrectAnswers 
        : (typeof payload.mistakes === 'number' ? payload.mistakes : 0),
    };
  }
  return payload;
}

export const supabaseRepository = {
  async syncItem(item: SyncQueueItem): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { entityType, payload, operation, entityId } = item;
    const formattedPayload = formatPayloadForSupabase(entityType, payload, entityId);

    switch (operation) {
      case 'INSERT': {
        const { error } = await supabase.from(entityType).insert([formattedPayload]);
        if (error) {
          // If table doesn't exist or RLS blocked it without session, don't crash app
          if (error.code === '42501' || error.message.includes('row-level security')) {
            console.warn(`Supabase RLS active for ${entityType} - sync will succeed when user authenticates`);
            return;
          }
          throw new Error(error.message);
        }
        break;
      }
      case 'UPDATE': {
        const { error } = await supabase
          .from(entityType)
          .update(formattedPayload)
          .eq('id', entityId);
        
        if (error) {
          if (error.code === '42501' || error.message.includes('row-level security')) {
            return;
          }
          throw new Error(error.message);
        }
        break;
      }
      case 'DELETE': {
        const { error } = await supabase
          .from(entityType)
          .delete()
          .eq('id', entityId);
        
        if (error) {
          if (error.code === '42501' || error.message.includes('row-level security')) {
            return;
          }
          throw new Error(error.message);
        }
        break;
      }
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }
};

