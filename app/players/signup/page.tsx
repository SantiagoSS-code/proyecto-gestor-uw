'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function PlayerSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className="shadow-xl border-0 text-gray-900">
              <CardContent className="py-10">
                <p className="text-center text-gray-700">Cargando…</p>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <PlayerSignupInner />
    </Suspense>
  );
}

function PlayerSignupInner() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get('next');

  const getSafeNext = (value: string | null) => {
    if (!value) return null;
    if (!value.startsWith('/')) return null;
    if (value.startsWith('//')) return null;
    return value;
  };

  const safeNext = getSafeNext(nextParam);

  useEffect(() => {
    if (typeof window !== 'undefined' && safeNext) {
      localStorage.setItem('playerNext', safeNext);
    }
  }, [safeNext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await sendEmailVerification(user);

      await setDoc(doc(db, 'players', user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email.toLowerCase().trim(),
        createdAt: new Date(),
        onboardingCompleted: false,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "playerSignup",
          JSON.stringify({
            name: formData.name,
            email: formData.email.toLowerCase().trim(),
          })
        )
        localStorage.setItem("playerIdentifier", formData.email.toLowerCase().trim())
        localStorage.setItem("playerIsNew", "true")
        if (safeNext) {
          localStorage.setItem("playerNext", safeNext)
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        role: 'player',
        email: formData.email,
        createdAt: new Date(),
      }, { merge: true });

      router.replace('/players/onboarding/personal-details');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      await sendEmailVerification(user);

      await setDoc(doc(db, 'players', user.uid), {
        uid: user.uid,
        name: user.displayName || '',
        email: (user.email || '').toLowerCase().trim(),
        createdAt: new Date(),
        onboardingCompleted: false,
      }, { merge: true });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "playerSignup",
          JSON.stringify({
            name: user.displayName || "",
            email: (user.email || "").toLowerCase().trim(),
          })
        )
        localStorage.setItem("playerIdentifier", (user.email || "").toLowerCase().trim())
        localStorage.setItem("playerIsNew", "true")
        if (safeNext) {
          localStorage.setItem("playerNext", safeNext)
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        role: 'player',
        email: user.email || '',
        createdAt: new Date(),
      }, { merge: true });

      router.replace('/players/onboarding/personal-details');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              courtly
            </span>
          </Link>
        </div>

        <Card className="shadow-xl border-0 text-gray-900">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-gray-900">Crea tu cuenta de jugador</CardTitle>
            <CardDescription className="text-gray-700">
              Empieza a encontrar jugadores y partidos cerca de ti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              variant="outline"
              className="w-full mb-4 text-gray-900"
            >
              {googleLoading ? 'Creando cuenta...' : 'Continuar con Google'}
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-600">O crea una cuenta con email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-900">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  placeholder="Escribe tu nombre"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-900">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  placeholder="Escribe tu correo"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-900">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="pr-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    placeholder="Crea una contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-black shadow-lg"
                disabled={loading}
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>

            <div className="text-center mt-4">
              <Link
                href={safeNext ? `/players/login?next=${encodeURIComponent(safeNext)}` : "/players/login"}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
