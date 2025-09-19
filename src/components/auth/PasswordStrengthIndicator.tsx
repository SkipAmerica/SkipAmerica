import { CheckCircle, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordCriteria {
  label: string;
  test: (password: string) => boolean;
  type: 'security' | 'strength';
}

const passwordCriteria: PasswordCriteria[] = [
  {
    label: 'At least 8 characters long',
    test: (pwd) => pwd.length >= 8,
    type: 'security'
  },
  {
    label: 'Contains uppercase letter',
    test: (pwd) => /[A-Z]/.test(pwd),
    type: 'strength'
  },
  {
    label: 'Contains lowercase letter', 
    test: (pwd) => /[a-z]/.test(pwd),
    type: 'strength'
  },
  {
    label: 'Contains number',
    test: (pwd) => /\d/.test(pwd),
    type: 'strength'
  },
  {
    label: 'Contains special character',
    test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(pwd),
    type: 'strength'
  },
  {
    label: 'Not a common password',
    test: (pwd) => {
      const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
      return !commonPasswords.includes(pwd.toLowerCase());
    },
    type: 'security'
  }
];

export const PasswordStrengthIndicator = ({ password, className = '' }: PasswordStrengthIndicatorProps) => {
  if (!password) {
    return null;
  }

  const results = passwordCriteria.map(criteria => ({
    ...criteria,
    passed: criteria.test(password)
  }));

  const securityResults = results.filter(r => r.type === 'security');
  const strengthResults = results.filter(r => r.type === 'strength');

  const securityPassed = securityResults.filter(r => r.passed).length;
  const strengthPassed = strengthResults.filter(r => r.passed).length;
  const totalPassed = results.filter(r => r.passed).length;

  // Calculate strength level
  const getStrengthLevel = () => {
    if (securityPassed < securityResults.length) return 'weak';
    if (totalPassed < 4) return 'fair';
    if (totalPassed < 6) return 'good';
    return 'strong';
  };

  const strengthLevel = getStrengthLevel();
  const strengthColors = {
    weak: 'text-red-600 bg-red-50 border-red-200',
    fair: 'text-orange-600 bg-orange-50 border-orange-200', 
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    strong: 'text-green-600 bg-green-50 border-green-200'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Alert className={strengthColors[strengthLevel]}>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Password Strength: {strengthLevel.charAt(0).toUpperCase() + strengthLevel.slice(1)}</span>
            <span className="text-xs">{totalPassed}/{results.length} criteria met</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                strengthLevel === 'weak' ? 'bg-red-500' :
                strengthLevel === 'fair' ? 'bg-orange-500' :
                strengthLevel === 'good' ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${(totalPassed / results.length) * 100}%` }}
            />
          </div>
          
          {/* Security Requirements (Critical) */}
          <div className="space-y-1">
            <div className="font-medium text-xs uppercase tracking-wide">Security Requirements:</div>
            {securityResults.map((result, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {result.passed ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-600" />
                )}
                <span className={result.passed ? 'text-green-700' : 'text-red-700'}>
                  {result.label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Strength Enhancements (Optional but recommended) */}
          <div className="space-y-1 mt-2">
            <div className="font-medium text-xs uppercase tracking-wide">Strength Enhancements:</div>
            {strengthResults.map((result, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {result.passed ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-gray-400" />
                )}
                <span className={result.passed ? 'text-green-700' : 'text-gray-600'}>
                  {result.label}
                </span>
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};