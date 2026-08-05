import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import TwoFactorModal from "@/components/TwoFactorModal";
import { LAST_ACTIVITY_KEY } from "@/hooks/useInactivityLogout";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState(false);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const tryRender = () => {
      if (cancelled || widgetIdRef.current) return;
      if (window.turnstile) {
        widgetIdRef.current = window.turnstile.render("#turnstile-widget", {
          sitekey: "0x4AAAAAAEGgibmedNvDV61I",
          callback: (token) => { setCaptchaToken(token); setCaptchaError(false); },
          "error-callback": () => setCaptchaError(true),
          "expired-callback": () => setCaptchaToken(null),
        });
      } else {
        setTimeout(tryRender, 100);
      }
    };
    tryRender();
    return () => { cancelled = true; };
  }, []);

  const resetCaptcha = () => {
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setCaptchaToken(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!captchaToken) {
      setError("Complete a verificação de segurança antes de continuar.");
      setCaptchaError(true);
      return;
    }

    setLoading(true);

    try {
      // 0. Verify captcha token server-side before attempting auth
      try {
        const captchaRes = await base44.functions.invoke("verifyCaptcha", { token: captchaToken });
        if (!captchaRes.data?.success) {
          setError("Verificação de segurança falhou. Tente novamente.");
          resetCaptcha();
          setLoading(false);
          return;
        }
      } catch (captchaErr) {
        setError("Verificação de segurança falhou. Tente novamente.");
        resetCaptcha();
        setLoading(false);
        return;
      }

      // 1. Check rate limit on the backend before attempting auth
      const rlRes = await base44.functions.invoke("checkLoginRateLimit", { email });
      if (!rlRes.data.allowed) {
        setError(rlRes.data.message || "Muitas tentativas de login. Tente novamente em breve.");
        resetCaptcha();
        setLoading(false);
        return;
      }

      // 2. Attempt auth
      try {
        await base44.auth.loginViaEmailPassword(email, password);
      } catch (authErr) {
        // Record failed attempt server-side via checkLoginRateLimit (action flag)
        base44.functions.invoke("checkLoginRateLimit", { email, action: "record_failure" });
        setError("E-mail ou senha inválidos.");
        resetCaptcha();
        setLoading(false);
        return;
      }

      // 3. Record success
      base44.functions.invoke("checkLoginRateLimit", { email, action: "record_success" });

      // 4. Check if 2FA is required (admin or tutor)
      const otpRes = await base44.functions.invoke("sendOtp", {});
      if (otpRes.data?.required) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
        setShow2FA(true);
        setLoading(false);
        return;
      }

      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      window.location.href = "/";
    } catch (err) {
      setError("E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (show2FA) {
    return <TwoFactorModal email={email} onVerified={() => { window.location.href = "/"; }} />;
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div id="turnstile-widget" className="my-3" />
        {captchaError && !captchaToken && (
          <div className="mb-2 text-sm text-destructive">
            Complete a verificação de segurança antes de continuar.
          </div>
        )}
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}