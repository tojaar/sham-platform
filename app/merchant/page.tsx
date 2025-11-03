'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function MerchantAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async () => {
    setMessage('');

    if (isSignup) {
      if (password !== confirmPassword) {
        setMessage('❌ كلمة المرور غير متطابقة');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'user' },
        },
      });

      if (error) {
        setMessage('❌ فشل في إنشاء الحساب: ' + error.message);
      } else {
        setMessage('✅ تم إنشاء الحساب بنجاح، يرجى تسجيل الدخول الآن');
        setIsSignup(false); // تحويل النموذج إلى تسجيل الدخول
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage('❌ فشل في تسجيل الدخول: ' + error.message);
      } else {
        router.push('/merchant/post'); // التوجيه بعد تسجيل الدخول فقط
      }
    }
  };

  return (
    <main style={main}>
      <div style={card}>
        <h1 style={heading}>{isSignup ? '🆕 إنشاء حساب جديد' : '🔐 تسجيل الدخول'}</h1>
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />
        {isSignup && (
          <input
            type="password"
            placeholder="تأكيد كلمة المرور"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={input}
          />
        )}
        <button onClick={handleAuth} style={button}>
          {isSignup ? 'إنشاء الحساب' : 'تسجيل الدخول'}
        </button>

        <div style={switchBox}>
          <p>{isSignup ? 'لديك حساب؟' : 'مستخدم جديد؟'}</p>
          <button onClick={() => setIsSignup(!isSignup)} style={switchButton}>
            {isSignup ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </button>
        </div>

        {message && <p style={messageStyle}>{message}</p>}
      </div>
    </main>
  );
}

const main = {
  minHeight: '100vh',
  background: 'linear-gradient(to right, #1e3a8a, #3b82f6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Segoe UI, sans-serif',
};

const card = {
  backgroundColor: '#fff',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 0 20px rgba(0,0,0,0.1)',
  width: '100%',
  maxWidth: '400px',
};

const heading = {
  fontSize: '1.5rem',
  marginBottom: '1rem',
  color: '#1e3a8a',
  textAlign: 'center',
};

const input = {
  width: '100%',
  padding: '0.75rem',
  marginBottom: '1rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
};

const button = {
  width: '100%',
  padding: '0.75rem',
  backgroundColor: '#1e3a8a',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const switchBox = {
  marginTop: '1rem',
  textAlign: 'center',
};

const switchButton = {
  marginTop: '0.5rem',
  backgroundColor: '#f3f4f6',
  border: '1px solid #ccc',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const messageStyle = {
  marginTop: '1rem',
  color: '#1e3a8a',
  textAlign: 'center',
};