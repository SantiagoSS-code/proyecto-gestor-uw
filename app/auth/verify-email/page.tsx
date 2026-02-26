'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle } from 'lucide-react';

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function VerifyEmailPage() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Get email from localStorage
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('pendingVerificationEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newCode.every(digit => digit !== '')) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (enteredCode: string) => {
    if (!user) {
      setError('Session expired. Please sign up again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        setError('User not found. Please sign up again.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const storedCode = userData.verificationCode;
      const codeExpiry = userData.verificationCodeExpiry;

      if (!storedCode || !codeExpiry) {
        setError('No verification code found. Please request a new one.');
        setLoading(false);
        return;
      }

      if (Date.now() > codeExpiry) {
        setError('Verification code has expired. Please request a new one.');
        setLoading(false);
        return;
      }

      if (enteredCode !== storedCode) {
        setError('Invalid verification code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Code is valid - mark email as verified
      await updateDoc(doc(db, 'users', user.uid), {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
        verifiedAt: new Date(),
      });

      // Clean up localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingVerificationEmail');
        localStorage.removeItem('pendingVerificationUserId');
      }

      setSuccess(true);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push('/clubos/dashboard');
      }, 1500);

    } catch (err: any) {
      console.error('Verification error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!user || resendCooldown > 0) return;

    setResending(true);
    setError('');

    try {
      const newCode = generateVerificationCode();
      const codeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Update code in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        verificationCode: newCode,
        verificationCodeExpiry: codeExpiry,
      });

      // Send new code via API
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || user.email,
          code: newCode,
          name: user.displayName || '',
        }),
      });

      const data = await response.json();
      
      // In development, show the code in console
      if (data.debug_code) {
        console.log('Verification code:', data.debug_code);
      }

      setResendCooldown(60); // 60 second cooldown
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

    } catch (err: any) {
      console.error('Resend error:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit verification code to<br />
            <span className="font-medium text-gray-900">{email || user?.email || 'your email'}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-semibold"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button
            onClick={() => verifyCode(code.join(''))}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={loading || code.some(d => d === '')}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Didn&apos;t receive the code?</p>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="text-blue-600 hover:text-blue-700"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend Code'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}