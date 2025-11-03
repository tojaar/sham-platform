import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const router = useRouter();

useEffect(() => {
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== 'admin') {
      router.push('/login');
    }
  };
  checkAuth();
}, []);