import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
});

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as { from?: Location })?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") errors.email = err.message;
        if (err.path[0] === "password") errors.password = err.message;
      });
      setLoginErrors(errors);
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    if (error) {
      let message = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      if (error.message.includes("Invalid login credentials")) {
        message = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      } else if (error.message.includes("Email not confirmed")) {
        message = "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
      }
      toast({ variant: "destructive", title: "เข้าสู่ระบบไม่สำเร็จ", description: message });
    } else {
      toast({ title: "เข้าสู่ระบบสำเร็จ", description: "ยินดีต้อนรับกลับมา!" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[hsl(40,30%,95%)] p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img alt="Ranchu Center" className="w-16 h-16 rounded-none object-cover border-0 border-none shadow-none" src="/lovable-uploads/3a43d539-8288-45ca-bb0b-21d6b15cb782.png" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Ranchu Center</h1>
            <p className="text-muted-foreground mt-1">ระบบบริหารคลินิกสุขภาพจิต</p>
          </div>

          <Card className="border-0 shadow-xl bg-card/95 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-center">เข้าสู่ระบบ</CardTitle>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <CardDescription className="text-center">
                  เข้าสู่ระบบเพื่อจัดการข้อมูลคลินิก
                </CardDescription>

                <div className="space-y-2">
                  <Label htmlFor="login-email">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="login-email" type="email" placeholder="doctor@clinic.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" disabled={isLoading} />
                  </div>
                  {loginErrors.email && <p className="text-sm text-destructive">{loginErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">รหัสผ่าน</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10 pr-10" disabled={isLoading} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {loginErrors.password && <p className="text-sm text-destructive">{loginErrors.password}</p>}
                </div>
              </CardContent>

              <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังเข้าสู่ระบบ...
                    </>
                  ) : "เข้าสู่ระบบ"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">© 2026 Ranchu Center. All rights reserved.</p>
        </div>
      </div>

      {/* Right - Branding Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[hsl(170,30%,90%)] to-[hsl(170,25%,85%)] items-center justify-center p-12">
        <div className="text-center max-w-lg">
          <div className="w-40 h-40 mx-auto mb-8 rounded-full bg-[hsl(170,20%,82%)] flex items-center justify-center">
            <img alt="Ranchu Center" className="w-100 h-100 opacity-100 rounded-none border-white border-0 border-none object-cover" src="/lovable-uploads/c0e14f14-cfc4-46e6-bd6a-9ba876dd4ff4.png" />
          </div>
          <h2 className="text-3xl font-bold text-[hsl(160,30%,30%)] mb-4">ดูแลสุขภาพจิต ดูแลชีวิต</h2>
          <p className="text-[hsl(160,20%,40%)] leading-relaxed font-serif font-extralight px-[15px] mx-[15px] pt-0 text-sm pr-[10px] pl-[10px] text-center">
            ระบบจัดการคลินิกที่ออกแบบมาเพื่อทีมบำบัดและผู้ป่วย ช่วยให้การดูแลสุขภาพจิต เป็นเรื่องง่ายและมีประสิทธิภาพ
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
