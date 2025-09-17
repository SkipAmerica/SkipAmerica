import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Mail, Lock, User, Users, Crown } from 'lucide-react'

interface AuthFormProps {
  onSuccess?: () => void
}

export const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const { signIn, signUp, resetPassword, resendConfirmation, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  })

  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    accountType: 'fan' as 'fan' | 'creator' | 'agency' | 'industry_resource'
  })

  const [resetEmail, setResetEmail] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    const { error } = await signIn(signInData.email, signInData.password)
    
    if (error) {
      // Handle specific email confirmation error
      if (error.message.includes('Email not confirmed')) {
        setPendingEmail(signInData.email)
        setShowResendConfirmation(true)
      }
    } else {
      onSuccess?.()
    }
    
    setIsLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signUpData.password !== signUpData.confirmPassword) {
      return
    }
    
    setIsLoading(true)
    
    const { error } = await signUp(
      signUpData.email,
      signUpData.password,
      signUpData.fullName,
      signUpData.accountType
    )
    
    if (!error) {
      setPendingEmail(signUpData.email)
      // Redirect industry resources to setup page
      if (signUpData.accountType === 'industry_resource') {
        onSuccess?.()
        // Small delay to ensure state updates
        setTimeout(() => window.location.href = '/industry-setup', 100)
      } else {
        onSuccess?.()
      }
    }
    
    setIsLoading(false)
  }

  const handleResendConfirmation = async () => {
    setIsLoading(true)
    await resendConfirmation(pendingEmail)
    setIsLoading(false)
    setShowResendConfirmation(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    await resetPassword(resetEmail)
    setIsLoading(false)
    setShowResetPassword(false)
  }

  if (showResetPassword) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-creator bg-white">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-primary rounded-full">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              variant="gradient"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowResetPassword(false)}
            >
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-creator bg-white">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <h1 className="text-2xl font-bold">
            <span className="text-black">Sk</span>
            <span className="relative">
              <span className="text-black">i</span>
              <span className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full"></span>
            </span>
            <span className="text-black">p</span>
          </h1>
        </div>
        <CardTitle className="text-2xl text-black">
          Welcome to Skip
        </CardTitle>
        <CardDescription className="text-gray-600">
          Connect with creators through live video calls
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="signin" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={signInData.email}
                    onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10"
                    value={signInData.password}
                    onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <Button
                type="button"
                variant="link"
                className="px-0 text-sm text-primary"
                onClick={() => setShowResetPassword(true)}
              >
                Forgot your password?
              </Button>
              
              <Button 
                type="submit" 
                className="w-full" 
                variant="gradient"
                disabled={isLoading || loading}
              >
                {(isLoading || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    className="pl-10"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    className="pl-10"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Confirm your password"
                    className="pl-10"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>I want to join as:</Label>
                <RadioGroup 
                  value={signUpData.accountType} 
                  onValueChange={(value: 'fan' | 'creator' | 'agency' | 'industry_resource') => 
                    setSignUpData(prev => ({ ...prev, accountType: value }))
                  }
                  className="space-y-3"
                >
                  {/* Primary Account Types - More Prominent */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="fan" id="fan" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <Label htmlFor="fan" className="font-semibold cursor-pointer">User</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Discover and connect with creators</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="creator" id="creator" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-primary" />
                          <Label htmlFor="creator" className="font-semibold cursor-pointer">Creator</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Share your expertise and build your audience</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Secondary Account Types - Less Prominent */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/30 transition-colors opacity-75">
                      <RadioGroupItem value="agency" id="agency" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-blue-600" />
                          <Label htmlFor="agency" className="text-sm font-medium cursor-pointer">Agency</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Manage multiple creators</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/30 transition-colors opacity-75">
                      <RadioGroupItem value="industry_resource" id="industry_resource" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded bg-purple-600" />
                          <Label htmlFor="industry_resource" className="text-sm font-medium cursor-pointer">Industry Resource</Label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Corporate talent and industry experts</p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              
              {signUpData.password !== signUpData.confirmPassword && signUpData.confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                variant="gradient"
                disabled={isLoading || loading || signUpData.password !== signUpData.confirmPassword}
              >
                {(isLoading || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-6" />
        
        <div className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </div>
      </CardContent>
    </Card>
  )
}