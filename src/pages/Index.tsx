import { useAuth } from '@/hooks/useAuth';
import Dashboard from './Dashboard';
import Auth from './Auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogOut, Clock } from 'lucide-react';

const Index = () => {
  const { user, loading, isApproved, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-2">⚽</div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  if (isApproved === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-xl font-display">Cuenta pendiente de aprobación</CardTitle>
            <CardDescription>
              Tu cuenta ha sido creada correctamente pero necesita ser aprobada por un administrador antes de poder acceder a MatchControl.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Recibirás acceso cuando el administrador autorice tu cuenta.
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
