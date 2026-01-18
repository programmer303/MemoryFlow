
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { NodeMap } from '../types';

export function useCloudSync(
  nodes: NodeMap,
  setNodes: (nodes: NodeMap) => void,
  localTimestamp: number,
  updateLocalTimestamp: (ts: number) => void
) {
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Use a ref to track if the current update was triggered by a pull
  // to prevent an immediate "bounce back" push.
  const isRemoteUpdate = useRef(false);

  // 1. Auth Listener & Initial Pull
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        pullData(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        pullData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Pull Logic
  const pullData = async (userId: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('tree_data, updated_at')
        .eq('user_id', userId)
        .single();

      if (data && !error) {
        const cloudTime = new Date(data.updated_at).getTime();
        
        // Conflict Resolution: Cloud Wins if newer
        if (cloudTime > localTimestamp) {
          console.log('[CloudSync] Cloud data is newer. Overwriting local.');
          isRemoteUpdate.current = true;
          setNodes(data.tree_data);
          updateLocalTimestamp(cloudTime);
        } else {
            console.log('[CloudSync] Local data is up to date.');
        }
      }
    } catch (err) {
      console.error('[CloudSync] Pull error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Push Logic (Debounced)
  useEffect(() => {
    if (!user) return;

    // If this change came from the cloud, don't push it back immediately
    if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      console.log('[CloudSync] Pushing data...');
      
      const now = new Date();
      
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          tree_data: nodes,
          updated_at: now.toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('[CloudSync] Push error:', error);
      } else {
        console.log('[CloudSync] Push success');
        // Optionally update local timestamp to match server time exactly, 
        // but keeping the local one is fine for conflict resolution logic.
      }
      
      setIsSyncing(false);
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timer);
  }, [nodes, user]);

  return { isSyncing };
}
