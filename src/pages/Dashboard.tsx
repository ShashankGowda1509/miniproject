import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, FileText, Video, Chrome, User, ArrowRight } from 'lucide-react';

const dashboardItems = [
  {
    title: 'AI Interview Practice',
    description: 'Practice HR and Technical interviews with voice-based AI interviewer',
    icon: Mic,
    path: '/dashboard/ai-interview',
    color: 'bg-primary/10 text-primary',
  },
  {
    title: 'Resume-Based Interview',
    description: 'Upload your resume and get personalized interview questions',
    icon: FileText,
    path: '/dashboard/resume-interview',
    color: 'bg-accent/10 text-accent',
  },
  {
    title: 'Live Meeting Mode',
    description: 'Join meetings with live transcription and AI assistance',
    icon: Video,
    path: '/dashboard/live-meeting',
    color: 'bg-success/10 text-success',
  },
  {
    title: 'Chrome Extension',
    description: 'Get the extension for real-time interview assistance',
    icon: Chrome,
    path: '/dashboard/chrome-extension',
    color: 'bg-warning/10 text-warning',
  },
  {
    title: 'Profile & Performance',
    description: 'View your practice history and track progress',
    icon: User,
    path: '/dashboard/profile',
    color: 'bg-muted text-muted-foreground',
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-primary-foreground/80 text-lg">
          Continue your interview preparation journey. Choose a practice mode below.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary">0</div>
            <p className="text-muted-foreground">Practice Sessions</p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-accent">0</div>
            <p className="text-muted-foreground">Questions Answered</p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-success">0 hrs</div>
            <p className="text-muted-foreground">Total Practice Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Items */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Practice Modes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Card className="card-interactive h-full group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {item.title}
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            <strong>Academic Project Notice:</strong> This platform is designed for learning and demonstration purposes. 
            All AI features are modular and can be extended with real AI models and APIs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
