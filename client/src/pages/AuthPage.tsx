import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Phone, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const { toast } = useToast();

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    twoFactorCode: ''
  });

  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginForm),
      });

      const result = await response.json();

      if (result.success) {
        // Store the authentication token
        if (result.token) {
          localStorage.setItem('auth-token', result.token);
          document.cookie = `auth-token=${result.token}; path=/; max-age=604800; SameSite=Strict`;
        }
        
        toast({
          title: "Login Successful",
          description: "Welcome back to SniperX!",
        });
        onAuthSuccess();
      } else if (result.requires2FA) {
        setRequires2FA(true);
        toast({
          title: "Two-Factor Authentication Required",
          description: "Please enter your 6-digit authentication code.",
        });
      } else {
        toast({
          title: "Login Failed",
          description: result.message || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (registerForm.password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          username: registerForm.email.split('@')[0], // Generate username from email
          firstName: registerForm.firstName,
          lastName: registerForm.lastName,
          phoneNumber: registerForm.phoneNumber,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store the authentication token if provided
        if (result.token) {
          localStorage.setItem('auth-token', result.token);
          document.cookie = `auth-token=${result.token}; path=/; max-age=604800; SameSite=Strict`;
        }
        
        toast({
          title: "Registration Successful",
          description: "Welcome to SniperX! Your account has been created.",
        });
        onAuthSuccess();
      } else if (result.requiresEmailVerification) {
        setRequiresEmailVerification(true);
        toast({
          title: "Email Verification Required",
          description: "Please check your email and click the verification link.",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: result.message || "Registration failed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: registerForm.email }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Email Sent",
          description: "Verification email has been resent to your inbox.",
        });
      } else {
        toast({
          title: "Failed to Resend",
          description: result.message || "Could not resend verification email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to resend verification email.",
        variant: "destructive",
      });
    }
  };

  if (requiresEmailVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/80 border-purple-500/20 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
            <CardDescription className="text-gray-300">
              We've sent a verification link to {registerForm.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-blue-200">
                Click the verification link in your email to activate your SniperX account and start trading.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={resendVerificationEmail}
              variant="outline" 
              className="w-full border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
            >
              Resend Verification Email
            </Button>
            <Button 
              onClick={() => {
                setRequiresEmailVerification(false);
                setIsLogin(true);
              }}
              variant="ghost" 
              className="w-full text-gray-400 hover:text-white"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex">
      {/* Left side - Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-black/80 border-purple-500/20 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Welcome to SniperX</CardTitle>
            <CardDescription className="text-gray-300">
              {isLogin ? 'Sign in to your account' : 'Create your trading account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(value) => setIsLogin(value === 'login')}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
                <TabsTrigger value="login" className="text-gray-300 data-[state=active]:text-white">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="text-gray-300 data-[state=active]:text-white">
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {requires2FA && (
                    <div className="space-y-2">
                      <Label htmlFor="twoFactorCode" className="text-gray-300">2FA Code</Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="twoFactorCode"
                          type="text"
                          value={loginForm.twoFactorCode}
                          onChange={(e) => setLoginForm({ ...loginForm, twoFactorCode: e.target.value })}
                          className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="firstName"
                          type="text"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                          className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                          placeholder="John"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-gray-300">Phone Number (Optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={registerForm.phoneNumber}
                        onChange={(e) => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
                        className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="text-gray-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="registerPassword"
                        type={showPassword ? "text" : "password"}
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Create a strong password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                        className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Hero Section */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-gradient-to-br from-purple-800/20 to-blue-800/20">
        <div className="max-w-lg text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Revolutionary AI Trading Platform
            </h1>
            <p className="text-xl text-gray-300">
              Join thousands of traders using SniperX's advanced AI to maximize profits in the cryptocurrency market.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">24/7 AI Trading Bot</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Autonomous trading that never sleeps with 88.9% win rate and advanced risk management.
              </p>
            </div>
            
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Bank-Grade Security</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Military-grade AES-256 encryption with 2FA protection and secure wallet management.
              </p>
            </div>
            
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Real-Time Intelligence</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Advanced sentiment analysis from millions of social media posts and insider activity detection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}