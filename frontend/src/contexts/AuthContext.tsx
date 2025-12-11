import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, UserProfile } from '../services/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  username: string;
  role: 'ADMIN' | 'REQUESTER' | 'APPROVER';
  created_at?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let lastUserId: string | null = null;

    // Timeout de segurança para garantir que isLoading sempre seja false
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('AuthContext: Timeout ao carregar perfil, definindo isLoading como false');
        setIsLoading(false);
      }
    }, 10000); // 10 segundos

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      clearTimeout(timeoutId);
      setSession(session);
      if (session) {
        lastUserId = session.user.id;
        // Passar session para fetchUserProfile
        fetchUserProfile(session.user.id, session).finally(() => {
          if (mounted) {
            clearTimeout(timeoutId);
            setIsLoading(false);
          }
        });
      } else {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error('Error getting session:', error);
      if (mounted) {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    });

    // Listener para mudanças de autenticação
    // Ignorar eventos que não mudam o usuário para evitar re-renders
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Ignorar eventos TOKEN_REFRESHED se já temos o mesmo usuário
      // Isso evita re-fetch quando a aba volta ao foco
      if (session && session.user.id === lastUserId && event === 'TOKEN_REFRESHED') {
        // Apenas atualizar a sessão, não re-fetch o perfil
        setSession(session);
        return;
      }
      
      // Apenas processar se realmente mudou algo
      const currentUserId = session?.user.id || null;
      if (currentUserId === lastUserId && session && user) {
        // Mesmo usuário e já temos o perfil, apenas atualizar sessão se necessário
        setSession(session);
        return;
      }
      
      clearTimeout(timeoutId);
      setSession(session);
      if (session) {
        lastUserId = session.user.id;
        // Só buscar perfil se ainda não temos o user ou se mudou o usuário
        if (!user || user.id !== session.user.id) {
          await fetchUserProfile(session.user.id, session).finally(() => {
            if (mounted) {
              clearTimeout(timeoutId);
              setIsLoading(false);
            }
          });
        } else {
          setIsLoading(false);
        }
      } else {
        lastUserId = null;
        clearTimeout(timeoutId);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, currentSession?: Session | null): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Tentar buscar perfil com timeout curto
      const queryPromise = supabase
        .from('user_profiles')
        .select('id, username, role, created_at')
        .eq('id', userId)
        .single();

      // Timeout de 3 segundos
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );

      let data, error;
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        data = result.data;
        error = result.error;
      } catch (timeoutError: any) {
        // Se deu timeout, usar dados padrão
        console.warn('Timeout ao buscar perfil, usando dados padrão:', timeoutError.message);
        setUser({
          id: userId,
          username: currentSession?.user?.email?.split('@')[0] || 'Usuário',
          role: 'REQUESTER',
          created_at: new Date().toISOString(),
        });
        return;
      }

      if (error) {
        console.warn('Error fetching user profile:', error.message || error);
        // Se o perfil não existir ou houver erro, usar email como username
        setUser({
          id: userId,
          username: currentSession?.user?.email?.split('@')[0] || 'Usuário',
          role: 'REQUESTER',
          created_at: new Date().toISOString(),
        });
        return;
      }

      if (data) {
        setUser({
          id: data.id,
          username: data.username,
          role: data.role,
          created_at: data.created_at,
        });
      } else {
        // Se não retornou dados, criar usuário padrão
        setUser({
          id: userId,
          username: currentSession?.user?.email?.split('@')[0] || 'Usuário',
          role: 'REQUESTER',
          created_at: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.warn('Error fetching user profile:', error.message || error);
      // Em caso de erro, ainda permite login
      setUser({
        id: userId,
        username: session?.user?.email?.split('@')[0] || 'Usuário',
        role: 'REQUESTER',
        created_at: new Date().toISOString(),
      });
    }
    // Não setar isLoading(false) aqui - será feito no useEffect
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.session) {
      setSession(data.session);
      setIsLoading(true);
      await fetchUserProfile(data.session.user.id, data.session).finally(() => {
        setIsLoading(false);
      });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        logout,
        isAuthenticated: !!user && !!session,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
