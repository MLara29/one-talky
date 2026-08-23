import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function Register() {
  const { lang } = useLang();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") === "tutor" ? "tutor" : "student";
  // Validado via safeReturnTo: rejeita javascript:, domínios externos e
  // truques de path (//evil.com) — nunca usar o valor cru de "next" aqui.
  const nextUrl = searchParams.get("next") ? safeReturnTo("next") : null;
  const [role] = useState(defaultRole); // role fixed by URL — no in-page switcher
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const calculateAge = (dob) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getPasswordStrength = (pwd) => {
    const hasMinLength = pwd.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const checks = [hasMinLength, hasLetter, hasNumber];
    const passedCount = checks.filter(Boolean).length;
    const isValid = hasMinLength && hasLetter && hasNumber;
    return { isValid, hasMinLength, hasLetter, hasNumber, passedCount };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!passwordStrength.isValid) {
      setError("Sua senha precisa ter pelo menos 8 caracteres, incluindo letras e números.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!birthDate || calculateAge(birthDate) < 18) {
      setError("Você precisa ter 18 anos ou mais para usar a One Talky.");
      return;
    }
    if (!ageConfirmed) {
      setError("Você precisa confirmar que tem 18 anos ou mais.");
      return;
    }
    if (!termsAccepted) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password, role });
      // Store terms acceptance — will be saved after OTP verification via updateMe
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
        // Save terms acceptance on the user record
        await base44.auth.updateMe({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_accepted_version: "2026-08-08",
          privacy_policy_accepted: true,
          privacy_policy_accepted_version: "2026-08-08",
          birth_date: birthDate,
        });
      }
      window.location.href = nextUrl || (role === "tutor" ? "/onboarding/tutor" : "/onboarding/student");
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    const dest = nextUrl || (role === "tutor" ? "/onboarding/tutor" : "/onboarding/student");
    base44.auth.loginWithProvider("google", dest);
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
          <div className="space-y-1 mt-1.5">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  passwordStrength.passedCount > i
                    ? (passwordStrength.isValid ? "bg-green-500" : "bg-amber-500")
                    : "bg-gray-200"
                }`} />
              ))}
            </div>
            {password && !passwordStrength.isValid && (
              <p className="text-xs text-muted-foreground">
                {!passwordStrength.hasMinLength && "Mínimo de 8 caracteres. "}
                {!passwordStrength.hasLetter && "Inclua ao menos uma letra. "}
                {!passwordStrength.hasNumber && "Inclua ao menos um número."}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate">Data de nascimento</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="h-12"
            required
          />
        </div>
        <div className="flex items-start gap-3 pt-1">
          <Checkbox
            id="age"
            checked={ageConfirmed}
            onCheckedChange={(v) => setAgeConfirmed(!!v)}
            className="mt-0.5"
          />
          <label htmlFor="age" className="text-sm text-muted-foreground leading-snug cursor-pointer">
            Confirmo que tenho 18 anos ou mais.
          </label>
        </div>
        <div className="flex items-start gap-3 pt-1">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(v) => setTermsAccepted(!!v)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
            Li e concordo com os{" "}
            <Link to={role === "tutor" ? "/terms-of-use" : "/termos"} target="_blank" className="text-primary font-medium hover:underline">
              Termos de Uso
            </Link>{" "}
            e com a{" "}
            <Link to={role === "tutor" ? "/privacy-policy" : "/privacidade"} target="_blank" className="text-primary font-medium hover:underline">
              Política de Privacidade
            </Link>{" "}
            da One Talky.
          </label>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !termsAccepted || !ageConfirmed || !birthDate || !passwordStrength.isValid}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}