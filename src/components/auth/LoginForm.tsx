import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from '@/api/apiService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconLoader2, IconKey } from '@tabler/icons-react';
import { getOidcConfig, isOidcConfigured } from '@/config/appConfig'; 
import { Separator } from '@/components/ui/separator'; 


const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { setToken } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isOidcLoading, setIsOidcLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const from = location.state?.from?.pathname ?? "/";

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await loginUser({ username: data.email, password: data.password });
      setToken(response.token);
      toast.success("Login successful!");
      navigate(from, { replace: true });
    } catch (error) {
      const apiError = error as Error;
      const message = apiError.message || "An unexpected error occurred.";
      setErrorMessage(message);
      toast.error(`Login failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOidcLogin = () => {
    if (!isOidcConfigured()) {
        toast.error("OIDC Login is not configured.");
        return;
    }
    setIsOidcLoading(true);

    if (import.meta.env.DEV) {
      console.log("LoginForm: Simulating OIDC callback for MSW/dev environment.");
      sessionStorage.setItem('oidc_auth_code', 'mock_oidc_auth_code_123');
      navigate('/oidc-process-auth', { state: { from: location.state?.from } });
      return; 
    }
    
    const oidc = getOidcConfig();
    if (oidc.authorizationEndpoint && oidc.clientId && oidc.redirectUri) {
        const params = new URLSearchParams({
            client_id: oidc.clientId,
            redirect_uri: oidc.redirectUri,
            response_type: oidc.responseType,
            scope: oidc.scope,
        });
        window.location.href = `${oidc.authorizationEndpoint}?${params.toString()}`;
    } else {
        toast.error("OIDC configuration is incomplete.");
        setIsOidcLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials or use an external provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...form.register("email")}
                disabled={isLoading || isOidcLoading}
                autoComplete="username"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                disabled={isLoading || isOidcLoading}
                autoComplete="current-password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            {errorMessage && (
              <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">{errorMessage}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || isOidcLoading}>
              {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Logging in..." : "Login with Password"}
            </Button>
          </form>
          {isOidcConfigured() && (
            <>
              <div className="my-4 flex items-center">
                <Separator className="flex-1" />
                <span className="px-2 text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleOidcLogin}
                disabled={isLoading || isOidcLoading}
              >
                {isOidcLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isOidcLoading && <IconKey className="mr-2 h-4 w-4" />}
                {isOidcLoading ? "Processing..." : "Login with OIDC Provider"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}