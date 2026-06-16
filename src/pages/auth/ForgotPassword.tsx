import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Radio, Loader2, CheckCircle } from 'lucide-react';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch {
      setError('发送失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-600/20 via-transparent to-accent-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary-900/5 via-transparent to-accent-900/5 rounded-full" />
      </div>

      <div className="absolute top-0 left-0 w-full h-full opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4 shadow-glow">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-display mb-2">
            <span className="text-gradient">找回密码</span>
          </h1>
          <p className="text-muted">
            {isSubmitted ? '重置链接已发送' : '输入您的邮箱，我们将发送重置链接'}
          </p>
        </div>

        <div className="glass-card p-8">
          {isSubmitted ? (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">邮件已发送</h3>
                <p className="text-muted text-sm mb-4">
                  我们已向 <span className="text-foreground font-medium">{email}</span> 发送了密码重置链接，请查收并按照提示操作。
                </p>
                <p className="text-muted text-xs">
                  如果没有收到邮件，请检查垃圾邮件文件夹或{' '}
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    重新发送
                  </button>
                </p>
              </div>
              <Link
                to="/login"
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                返回登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-error/10 border border-error/30 text-error text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <div className="p-4 rounded-lg bg-primary-500/10 border border-primary-500/30">
                <p className="text-sm text-primary-300">
                  请输入您注册时使用的邮箱地址，我们将向该邮箱发送密码重置链接。
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入您的邮箱"
                    className="input-field pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    发送中...
                  </>
                ) : (
                  '发送重置链接'
                )}
              </button>
            </form>
          )}

          {!isSubmitted && (
            <div className="mt-6 pt-6 border-t border-border">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回登录页面
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-8">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}

export { ForgotPassword };
