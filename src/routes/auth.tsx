import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, ChevronLeft, Home } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { authService } from "@/lib/auth/session";
import {
  getSignupErrorMessage,
  isDuplicateUserSignup,
  getSigninErrorMessage,
  DUPLICATE_SIGNUP_ERROR,
} from "@/lib/auth/auth-error";
import { GhostMark } from "@/components/app-shell";

import { popRevocationReason } from "@/lib/auth/session-revocation";
import { rotateDeviceKey } from "@/lib/device-key";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const [loggedInUser, setLoggedInUser] = useState<{ email?: string; id?: string } | null>(null);

  useEffect(() => {
    if (search.mode) {
      setMode(search.mode);
    }
  }, [search.mode]);

  useEffect(() => {
    const reason = popRevocationReason();
    if (reason) {
      toast.warning(reason);
    }

    authService.getSession().then(({ data }) => {
      if (data.session?.user) {
        setLoggedInUser({ email: data.session.user.email, id: data.session.user.id });
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }

    // Client-side password validation
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    // Client-side password confirmation on signup
    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await authService.signUpWithPassword(
          trimmedEmail,
          password,
          window.location.origin,
        );

        if (error) {
          const errInfo = getSignupErrorMessage(error);
          toast.error(errInfo.title, {
            description: errInfo.message,
          });
          return;
        }

        if (!data?.user || isDuplicateUserSignup(data)) {
          toast.error(DUPLICATE_SIGNUP_ERROR.title, {
            description: DUPLICATE_SIGNUP_ERROR.message,
          });
          return;
        }

        if (!data.session) {
          toast.success("Account created", {
            description: "Check your email to verify your account.",
          });
          navigate({
            to: "/auth/verify-email",
            search: { email: trimmedEmail } as never,
          });
          return;
        }

        rotateDeviceKey();
        toast.success("Account created");
        navigate({ to: "/chats", replace: true });
      } else {
        rotateDeviceKey();
        const { error } = await authService.signInWithPassword(trimmedEmail, password);
        if (error) {
          const msg = getSigninErrorMessage(error);
          toast.error(msg);
          return;
        }
        navigate({ to: "/chats", replace: true });
      }
    } catch (err) {
      console.error("[auth submit exception]", err);
      const errInfo = getSignupErrorMessage(err);
      toast.error(errInfo.title, {
        description: errInfo.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    rotateDeviceKey();
    setGoogleLoading(true);
    try {
      const res = await authService.signInWithGoogle(`${window.location.origin}/auth`);
      if (res.error) throw res.error;
      if (!res.data?.url) {
        toast.success("Signed in with Google as Bindu (pbibinduamb@gmail.com)");
        navigate({ to: "/chats", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleGithub = async () => {
    rotateDeviceKey();
    setGithubLoading(true);
    try {
      const res = await authService.signInWithGithub(`${window.location.origin}/auth`);
      if (res.error) throw res.error;
      if (!res.data?.url) {
        toast.success("Signed in with GitHub as Bindu");
        navigate({ to: "/chats", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "GitHub sign-in failed");
      setGithubLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-white font-sans selection:bg-primary/20">
      
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-[#F7FAFE] p-12 lg:p-16 border-r border-[#DCE8F5] relative overflow-hidden isolate">
         {/* Ambient glow */}
         <div className="absolute top-[-20%] left-[-10%] h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle,rgba(37,135,245,0.08)_0%,rgba(247,250,254,0)_70%)] blur-3xl pointer-events-none -z-10" />
         <Link to="/" className="relative z-10 inline-flex items-center gap-3 cursor-pointer group transition-opacity hover:opacity-90">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <GhostMark className="h-[26px] w-[26px]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#0B1B33]">Ghostline</span>
          </Link>
          
          <div className="relative z-10 mb-16 max-w-[480px]">
            <h1 className="text-[42px] lg:text-[50px] font-extrabold tracking-tight text-[#0B1B33] leading-[1.08] mb-6">
              A quieter place<br />for conversations<br />that matter.
            </h1>
            <p className="text-[17px] text-[#64748B] leading-relaxed">
              Built for real connections. Join Ghostline to connect with the people you care about, privately and securely.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-[13px] font-medium text-[#94A3B8]">
            <span>🔒 End-to-End Encrypted</span>
            <span>•</span>
            <span>Zero Tracking</span>
          </div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 relative">
         
         {/* Top Navigation Links */}
         <div className="absolute top-6 left-6 flex items-center gap-2">
            <button 
              id="auth-go-back"
              type="button"
              onClick={() => navigate({ to: "/" })} 
              className="flex items-center gap-2 rounded-xl border border-[#DCE8F5] bg-white px-3 py-2 text-xs font-semibold text-[#0B1B33] shadow-sm transition-all hover:bg-[#F5FAFF] hover:border-primary/40 active:scale-95 cursor-pointer"
            >
               <Home className="h-4 w-4 text-[#2587F5]" />
               <span>Homepage</span>
            </button>
         </div>

         {/* Form Wrapper */}
         <div className="w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both mt-10 lg:mt-0">
           
           {/* Current Session Banner if user is already logged in */}
           {loggedInUser && (
             <div className="mb-6 rounded-2xl border border-primary/20 bg-[#F5FAFF] p-4 text-xs shadow-sm">
               <div className="flex items-center justify-between gap-2">
                 <div className="min-w-0">
                   <p className="font-bold text-[13px] text-[#0B1B33] truncate">
                     Logged in as <span className="text-primary">{loggedInUser.email}</span>
                   </p>
                   <p className="text-[#64748B] mt-0.5 text-[11px]">
                     You can jump to chats or switch accounts below.
                   </p>
                 </div>
                 <button
                   type="button"
                   onClick={() => navigate({ to: "/chats" })}
                   className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#1467D8] transition-colors cursor-pointer"
                 >
                   Open Chats
                 </button>
               </div>
               <div className="mt-3 pt-2.5 border-t border-[#DCE8F5] flex justify-end">
                 <button
                   type="button"
                   onClick={async () => {
                     await authService.signOut();
                     setLoggedInUser(null);
                     toast.success("Signed out successfully");
                   }}
                   className="text-[11px] font-semibold text-destructive hover:underline cursor-pointer"
                 >
                   Sign Out of {loggedInUser.email}
                 </button>
               </div>
             </div>
           )}

           {/* Mobile GhostMark */}
           <div className="lg:hidden mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
             <GhostMark className="h-7 w-7" />
           </div>

           {/* Mode Tabs: Sign In vs Register */}
           <div className="mb-6 flex rounded-xl bg-[#F5FAFF] p-1 border border-[#DCE8F5]">
             <button
               type="button"
               onClick={() => {
                 setMode("signin");
                 setConfirmPassword("");
               }}
               className={`flex-1 rounded-lg py-2.5 text-center text-sm font-bold transition-all cursor-pointer ${
                 mode === "signin"
                   ? "bg-white text-[#0B1B33] shadow-sm"
                   : "text-[#64748B] hover:text-[#0B1B33]"
               }`}
             >
               Sign In
             </button>
             <button
               type="button"
               onClick={() => {
                 setMode("signup");
                 setConfirmPassword("");
               }}
               className={`flex-1 rounded-lg py-2.5 text-center text-sm font-bold transition-all cursor-pointer ${
                 mode === "signup"
                   ? "bg-white text-[#0B1B33] shadow-sm"
                   : "text-[#64748B] hover:text-[#0B1B33]"
               }`}
             >
               Register
             </button>
           </div>

           <div className="mb-8 text-left">
              <h2 className="text-[26px] font-bold tracking-tight text-[#0B1B33]">
                {mode === "signin" ? "Welcome back" : "Create an account"}
              </h2>
               <p className="mt-1.5 text-[14px] text-[#64748B]">
                 {mode === "signin" ? "Enter your email & password to sign in." : "Register to start your private conversations."}
               </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label htmlFor="auth-email" className="block text-[13.5px] font-medium text-[#0B1B33] mb-1.5 text-left">
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[50px] w-full rounded-xl border border-[#DCE8F5] bg-[#F8FAFC] px-4 text-[15px] text-[#0B1B33] outline-none placeholder:text-[#94A3B8] transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-[13.5px] font-medium text-[#0B1B33]">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button type="button" className="text-[12.5px] font-semibold text-[#64748B] hover:text-primary transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center rounded-xl border border-[#DCE8F5] bg-[#F8FAFC] transition-all focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="Enter password (min. 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[50px] w-full rounded-xl bg-transparent px-4 pr-12 text-[15px] text-[#0B1B33] outline-none placeholder:text-[#94A3B8]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 flex h-11 w-11 items-center justify-center text-[#94A3B8] hover:text-[#0B1B33] transition-colors rounded-lg focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              {mode === "signup" && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-[13.5px] font-medium text-[#0B1B33] mb-1.5 text-left">
                    Repeat password
                  </label>
                  <div className="relative flex items-center rounded-xl border border-[#DCE8F5] bg-[#F8FAFC] transition-all focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-[50px] w-full rounded-xl bg-transparent px-4 pr-12 text-[15px] text-[#0B1B33] outline-none placeholder:text-[#94A3B8]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-1 flex h-11 w-11 items-center justify-center text-[#94A3B8] hover:text-[#0B1B33] transition-colors rounded-lg focus:outline-none"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

             <button
               id="auth-submit"
               type="submit"
               disabled={loading}
               className="mt-2 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-[#1467D8] active:scale-[0.98] disabled:opacity-60 disabled:hover:bg-primary"
             >
               {loading ? (
                 <span className="flex items-center gap-2">
                   <Loader2 className="h-5 w-5 animate-spin" />
                   {mode === "signup" ? "Creating account..." : "Signing in..."}
                 </span>
               ) : mode === "signup" ? (
                 "Create account"
               ) : (
                 "Sign in"
               )}
             </button>
           </form>

           {/* Mode Toggle */}
           <div className="mt-5 text-center">
             <button
               id="auth-toggle-mode"
               type="button"
               onClick={() => {
                 setMode(mode === "signup" ? "signin" : "signup");
                 setConfirmPassword("");
                 setPassword("");
               }}
               className="text-[14.5px] text-[#64748B] hover:text-[#0B1B33] transition-colors"
             >
               {mode === "signup" ? (
                 <>Already have an account? <span className="font-bold text-primary">Sign in</span></>
               ) : (
                 <>Don't have an account? <span className="font-bold text-primary">Sign up</span></>
               )}
             </button>
           </div>
           
           <div className="mt-7 flex items-center gap-4">
             <div className="h-px flex-1 bg-[#EAF4FF]" />
             <span className="text-[12.5px] font-semibold text-[#94A3B8] tracking-wide">Or continue with</span>
             <div className="h-px flex-1 bg-[#EAF4FF]" />
           </div>

           <div className="mt-6 grid grid-cols-2 gap-3">
             <button
               onClick={handleGoogle}
               disabled={googleLoading || githubLoading || loading}
               className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DCE8F5] bg-white transition-all hover:bg-[#F5FAFF] hover:border-[#B8D3F0] active:scale-[0.96] disabled:opacity-60"
               aria-label="Continue with Google"
             >
               {googleLoading ? (
                 <>
                   <Loader2 className="h-5 w-5 animate-spin text-[#64748B]" />
                   <span className="text-[14px] font-semibold text-[#0B1B33]">Connecting...</span>
                 </>
               ) : (
                 <>
                   <GoogleIcon />
                   <span className="text-[14px] font-semibold text-[#0B1B33]">Google</span>
                 </>
               )}
             </button>
             
             <button
               onClick={handleGithub}
               disabled={googleLoading || githubLoading || loading}
               className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DCE8F5] bg-white transition-all hover:bg-[#F5FAFF] hover:border-[#B8D3F0] active:scale-[0.96] disabled:opacity-60"
               aria-label="Continue with GitHub"
             >
               {githubLoading ? (
                 <>
                   <Loader2 className="h-5 w-5 animate-spin text-[#64748B]" />
                   <span className="text-[14px] font-semibold text-[#0B1B33]">Connecting...</span>
                 </>
               ) : (
                 <>
                   <GithubIcon />
                   <span className="text-[14px] font-semibold text-[#0B1B33]">GitHub</span>
                 </>
               )}
             </button>
           </div>
         </div>

      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.995 6.995 0 0 1 5.47 12c0-.73.13-1.43.36-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" fill="#0B1B33" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}


