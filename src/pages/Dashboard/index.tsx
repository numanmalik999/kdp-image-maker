import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardContent from './DashboardContent';
import { Loader2 } from 'lucide-react';

interface DashboardProps {
  onEditBook: (bookId: string) => void;
  // Removed onViewPricing and onManageBilling
}

export default function Dashboard({ onEditBook }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardContent
      onEditBook={onEditBook}
      // Removed onViewPricing and onManageBilling
    />
  );
}