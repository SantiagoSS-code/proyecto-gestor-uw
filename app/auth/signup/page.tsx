'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { slugify } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { SignupStep1, type Step1FormData } from '@/components/auth/signup-step1';
import { SignupStep2, type Step2FormData } from '@/components/auth/signup-step2-simple';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [step2Data, setStep2Data] = useState<Step2FormData>({
    nombre: '',
    apellido: '',
    telefono: '',
    street: '',
    streetNumber: '',
    country: '',
    countryId: '',
    province: '',
    provinceId: '',
    city: '',
    cityId: '',
    locality: '',
    localityId: '',
    postalCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleStep1Next = () => {
    setCurrentStep(2);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep2Submit = async () => {
    setError('');
    setLoading(true);

    try {
      const { user } = await createUserWithEmailAndPassword(auth, step1Data.email, step1Data.password);
      
      const verificationCode = generateVerificationCode();
      const codeExpiry = Date.now() + 10 * 60 * 1000;

      await setDoc(doc(db, 'padel_centers', user.uid), {
        name: step2Data.nombre,
        email: step1Data.email,
        phone: step2Data.telefono,
        country: step2Data.country,
        province: step2Data.province,
        city: step2Data.city,
        locality: step2Data.locality,
        street: step2Data.street,
        streetNumber: step2Data.streetNumber,
        postalCode: step2Data.postalCode,
        createdAt: new Date(),
        plan: 'starter',
        status: 'active',
        onboardingCompleted: false,
      });

      const slugBase = slugify(step2Data.nombre);
      const slug = slugBase ? `${slugBase}-${user.uid.slice(0, 6)}` : `club-${user.uid.slice(0, 6)}`;
      await setDoc(doc(db, 'centers', user.uid), {
        name: step2Data.nombre,
        email: step1Data.email,
        phone: step2Data.telefono,
        country: step2Data.country,
        province: step2Data.province,
        city: step2Data.city,
        locality: step2Data.locality,
        street: step2Data.street,
        streetNumber: step2Data.streetNumber,
        postalCode: step2Data.postalCode,
        slug,
        published: false,
        featuredRank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });

      await setDoc(doc(db, 'users', user.uid), {
        role: 'center_admin',
        legacyRole: 'padel_center_admin',
        centerId: user.uid,
        email: step1Data.email,
        emailVerified: false,
        verificationCode,
        verificationCodeExpiry: codeExpiry,
        createdAt: new Date(),
      });

      await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: step1Data.email,
          code: verificationCode,
          name: step2Data.nombre,
        }),
      });

      router.push('/auth/verify-email');
    } catch (err: any) {
      setError(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, 'users', user.uid), {
        role: 'center_admin',
        legacyRole: 'padel_center_admin',
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: true,
        createdAt: new Date(),
      }, { merge: true });

      router.push('/auth/verify-email');
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 relative overflow-hidden">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl mix-blend-multiply"></div>
        <div className="absolute bottom-20 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl mix-blend-multiply"></div>
        <div className="absolute inset-0 flex flex-col justify-center items-start p-12 z-10 text-white">
          <h1 className="text-5xl font-bold mb-4">Transforma tu Centro</h1>
          <p className="text-xl text-blue-100 mb-10 max-w-md">Gestión inteligente de reservas que aumenta tus ingresos y reduce cancelaciones</p>
          
          <div className="space-y-5 max-w-md">
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-3 flex-shrink-0 min-w-fit">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Aumenta Ingresos</h3>
                <p className="text-blue-100 text-sm">Optimiza ocupación y reduce cancelaciones automáticamente</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-3 flex-shrink-0 min-w-fit">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Automatización Total</h3>
                <p className="text-blue-100 text-sm">Pagos, confirmaciones y notificaciones sin intervención manual</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-3 flex-shrink-0 min-w-fit">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Analítica Avanzada</h3>
                <p className="text-blue-100 text-sm">Reportes en tiempo real para tomar mejores decisiones</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-3 flex-shrink-0 min-w-fit">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Cobros Garantizados</h3>
                <p className="text-blue-100 text-sm">Integración con Mercado Pago, Stripe y métodos locales</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 py-12 sm:px-12 lg:px-16">
        {/* Progress Bar - Always at Top */}
        <div className="mb-8 flex items-center gap-2">
          <div className={`h-1 flex-1 rounded-full transition-colors ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`h-1 flex-1 rounded-full transition-colors ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <span className="ml-3 text-sm font-medium text-gray-600">Paso {currentStep} de 2</span>
        </div>

        <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">courtly</span>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Crea tu cuenta</h2>
            <p className="text-gray-600">Únete a cientos de centros de padel</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentStep === 1 && (
            <SignupStep1
              data={step1Data}
              onChange={setStep1Data}
              onNext={handleStep1Next}
              loading={loading}
              error={error}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              onGoogleSignup={handleGoogleSignup}
              googleLoading={googleLoading}
            />
          )}

          {currentStep === 2 && (
            <div>
              <SignupStep2 data={step2Data} onChange={setStep2Data} />

              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  onClick={handleStep2Back}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Atrás
                </Button>
                <Button
                  type="button"
                  onClick={handleStep2Submit}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Creando...' : 'Continuar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
