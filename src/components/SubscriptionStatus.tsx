import { useState, useEffect } from 'react';
import { Crown, Calendar, Zap, BookOpen, Image, FileText, Settings, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SubscriptionData {
  subscription_tier: 'free' | 'pro' | 'premium';
  books_limit: number;
  pages_per_book_limit: number;
  ai_credits_remaining: number;
}

interface UsageData {
  books_created: number;
  pages_generated: number;
  images_generated: number;
  period_end: string;
}

interface SubscriptionStatusProps {
  onUpgrade: () => void;
  onManageBilling: () => void;
}

const DEFAULT_FREE_LIMITS: SubscriptionData = {
  subscription_tier: 'free',
  books_limit: 2,
  pages_per_book_limit: 20,
  ai_credits_remaining: 20,
};

const getInitialUsage = (): UsageData => {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(now.getDate() + 30); // Default 30 days for free tier
  return {
    books_created: 0,
    pages_generated: 0,
    images_generated: 0,
    period_end: periodEnd.toISOString(),
  };
};

export default function SubscriptionStatus({ onUpgrade, onManageBilling }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, books_limit, pages_per_book_limit, ai_credits_remaining')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setSubscription(profile);
      } else {
        // Fallback if profile is somehow missing (shouldn't happen with trigger)
        setSubscription(DEFAULT_FREE_LIMITS);
      }

      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('books_created, pages_generated, images_generated, period_end')
        .eq('user_id', user.id)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (usageData) {
        setUsage(usageData);
      } else {
        // If usage tracking is missing (e.g., new user), use default values
        setUsage(getInitialUsage());
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      // Set default state on error to prevent infinite loading/null return
      setSubscription(DEFAULT_FREE_LIMITS);
      setUsage(getInitialUsage());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  // If we reach here, subscription and usage should have been set, either from DB or defaults
  if (!subscription || !usage) {
    return null;
  }

  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
  };

  const tierIcons = {
    free: null,
    pro: <Zap className="w-4 h-4" />,
    premium: <Crown className="w-4 h-4" />,
  };

  const getProgressColor = (used: number, limit: number) => {
    if (limit === 0) return 'bg-gray-400';
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const booksPercentage = (usage.books_created / subscription.books_limit) * 100;
  const aiCreditsUsed = subscription.ai_credits_remaining;
  const totalAiCredits = subscription.subscription_tier === 'free' ? 20 :
                         subscription.subscription_tier === 'pro' ? 200 : 1000;
  
  // Calculate AI credit usage percentage (inverted, as we track remaining)
  const aiCreditsPercentage = ((totalAiCredits - aiCreditsUsed) / totalAiCredits) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${tierColors[subscription.subscription_tier]}`}>
            {tierIcons[subscription.subscription_tier]}
            {subscription.subscription_tier.charAt(0).toUpperCase() + subscription.subscription_tier.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {subscription.subscription_tier !== 'premium' && (
            <button
              onClick={onUpgrade}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Zap className="w-4 h-4" />
              Upgrade
            </button>
          )}
          {subscription.subscription_tier !== 'free' && (
            <button
              onClick={onManageBilling}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Renews on {formatDate(usage.period_end)}</span>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <BookOpen className="w-4 h-4" />
                <span>Books Created</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage.books_created} / {subscription.books_limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(usage.books_created, subscription.books_limit)}`}
                style={{ width: `${Math.min(booksPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="w-4 h-4" />
                <span>Pages Generated (Total)</span>
              </div>
              <span className="text-sm text-gray-600">
                {usage.pages_generated}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Image className="w-4 h-4" />
                <span>AI Credits Remaining</span>
              </div>
              <span className="text-sm text-gray-600">
                {aiCreditsUsed} / {totalAiCredits}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(totalAiCredits - aiCreditsUsed, totalAiCredits)}`}
                style={{ width: `${Math.min(100 - aiCreditsPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {booksPercentage >= 80 && subscription.subscription_tier !== 'premium' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You're approaching your monthly limit. Consider upgrading to create more books.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}