import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { useAuthStore } from '@/store/authStore';
import { exchangeOidcCode } from '@/api/apiService';
import { toast } from 'sonner';
import { IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function OidcCallback() {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { setToken } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = sessionStorage.getItem('oidc_auth_code');
    const errorParam = sessionStorage.getItem('oidc_auth_error');
    const errorDescription = sessionStorage.getItem('oidc_auth_error_description');

    sessionStorage.removeItem('oidc_auth_code');
    sessionStorage.removeItem('oidc_auth_error');
    sessionStorage.removeItem('oidc_auth_error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
      toast.error(`OIDC Login Error: ${errorDescription || errorParam}`);
      setIsLoading(false);
      return;
    }

    if (!code) {
      setError('Authorization code not found after OIDC callback.');
      toast.error('OIDC callback error: Authorization code missing.');
      setIsLoading(false);
      return;
    }

    const performTokenExchange = async (authCode: string) => {
      try {
        const response = await exchangeOidcCode({ code: authCode });
        setToken(response.token);
        toast.success('Successfully logged in via OIDC!');
        
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });

      } catch (apiError: any) {
        const message = apiError.message || 'Failed to exchange OIDC code for token.';
        setError(message);
        toast.error(`OIDC Login Failed: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    performTokenExchange(code);
  }, [setToken, navigate, location.state]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <IconLoader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Processing OIDC login...</p>
        <p className="text-sm text-muted-foreground">Please wait while we verify your identity.</p>
      </div>
    );
  }

  return (
     <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="mx-auto max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <IconAlertCircle className={`h-12 w-12 ${error ? 'text-destructive' : 'text-primary'} mx-auto mb-3`} />
            <CardTitle className="text-2xl">
              {error ? 'OIDC Login Failed' : 'OIDC Login Issue'}
            </CardTitle>
            <CardDescription>
              {error || 'An unexpected issue occurred during OIDC login.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
             <Button onClick={() => navigate('/login', { replace: true })} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}