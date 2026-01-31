import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Brain, Users } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Password must be at least 6 characters.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-foreground to-primary/80 p-12 flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-foreground flex items-center gap-3">
            <Brain className="h-8 w-8" />
            InterviewAI
          </h1>
        </div>
        
        <div className="space-y-8">
          <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
            Practice Interviews with AI-Powered Assistance
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Prepare for your next interview with voice-based AI practice sessions, 
            resume analysis, and real-time feedback.
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4 text-primary-foreground/90">
              <div className="p-3 bg-primary-foreground/10 rounded-lg">
                <Mic className="h-6 w-6" />
              </div>
              <span>Voice-based interview practice</span>
            </div>
            <div className="flex items-center gap-4 text-primary-foreground/90">
              <div className="p-3 bg-primary-foreground/10 rounded-lg">
                <Brain className="h-6 w-6" />
              </div>
              <span>AI-powered feedback and suggestions</span>
            </div>
            <div className="flex items-center gap-4 text-primary-foreground/90">
              <div className="p-3 bg-primary-foreground/10 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <span>Live meeting mode with transcription</span>
            </div>
          </div>
        </div>

        <p className="text-primary-foreground/60 text-sm">
          Academic Project — For Learning & Demonstration Purposes
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1">
            <div className="lg:hidden flex items-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">InterviewAI</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full h-11 btn-gradient"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
