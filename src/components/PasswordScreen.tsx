import { useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordScreenProps {
  onAuthenticated: () => void;
}

export function PasswordScreen({ onAuthenticated }: PasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password === 'danitrailandrun') {
      sessionStorage.setItem('authenticated', 'true');
      onAuthenticated();
    } else {
      setError('Contraseña incorrecta. Por favor, intenta de nuevo.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="rounded-full bg-primary/10 p-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Acceso Restringido</h1>
            <p className="text-muted-foreground">
              Por favor, ingresa la contraseña para acceder a la herramienta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Ingresa la contraseña"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Acceder
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

