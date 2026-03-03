"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  centerId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  centerId: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCenterId(userDoc.data()?.centerId || null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
        setCenterId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, centerId, loading }}>
      {children}
    </AuthContext.Provider>
  );
};