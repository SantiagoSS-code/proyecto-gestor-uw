'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface Step1FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignupStep1Props {
  data: Step1FormData;
  onChange: (data: Step1FormData) => void;
  onNext: () => void;
  loading?: boolean;
  error?: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  onGoogleSignup?: () => Promise<void>;
  googleLoading?: boolean;
}

export function SignupStep1({
  data,
  onChange,
  onNext,
  loading = false,
  error,
  showPassword,
  onTogglePassword,
  onGoogleSignup,
  googleLoading = false,
}: SignupStep1Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data.email.trim()) {
      alert('El email es requerido');
      return;
    }
    if (data.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (data.password !== data.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          required
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Contraseña *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={data.password}
            onChange={(e) => onChange({ ...data, password: e.target.value })}
            required
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={data.confirmPassword}
            onChange={(e) => onChange({ ...data, confirmPassword: e.target.value })}
            required
            placeholder="Confirma tu contraseña"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 rounded-lg"
      >
        {loading ? 'Continuando...' : 'Continuar'}
      </Button>

      {onGoogleSignup && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O continúa con</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={onGoogleSignup}
            disabled={googleLoading}
            variant="outline"
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </Button>
        </>
      )}

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/clubos/login" className="text-blue-600 hover:underline font-medium">
          Inicia sesión aquí
        </Link>
      </p>
    </form>
  );
}
