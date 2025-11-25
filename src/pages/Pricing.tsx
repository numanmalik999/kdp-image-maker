import { useState } from 'react';
import { Check, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PricingProps {
  currentTier?: 'free' | 'pro' | 'premium';
  onBack?: () => void;
  onAuthRequired?: (authType: 'login' | 'signup') => void;
}

export default function Pricing({ currentTier = 'free', onBack, onAuthRequired }: PricingProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const isLoggedOut = !!onAuthRequired;

  const handleUpgrade = async (planType: 'pro' | 'premium') => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      if (onAuthRequired) {
        // If unauthenticated, redirect to login flow
        onAuthRequired('signup');
      } else {
        alert('Please log in or sign up to upgrade.');
      }
      return;
    }

    try {
      setLoading(planType);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_type: planType }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      const errorMessage = error.message || 'Failed to start checkout. Please try again.';

      if (errorMessage.includes('Stripe') || errorMessage.includes('price')) {
        alert('Payment system is not yet configured. Please contact support or check back later.');
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      type: 'free' as const,
      description: 'Perfect for trying out the platform',
      features: [
        '2 books per month',
        '20 pages per book',
        '20 AI image generations',
        'Basic support',
        'Watermark on exports',
      ],
      cta: 'Current Plan',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'per month',
      type: 'pro' as const,
      description: 'For regular publishers',
      features: [
        '10 books per month',
        '50 pages per book',
        '200 AI image generations',
        'No watermark',
        'Priority support',
        'Export to PDF & EPUB',
      ],
      cta: 'Upgrade to Pro',
      highlighted: true,
    },
    {
      name: 'Premium',
      price: '$49',
      period: 'per month',
      type: 'premium' as const,
      description: 'For professional publishers',
      features: [
        'Unlimited books',
        '100 pages per book',
        '1000 AI image generations',
        'No watermark',
        'Priority support',
        'Export to PDF & EPUB',
        'Bulk export tools',
        'Advanced customization',
      ],
      cta: 'Upgrade to Premium',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to {currentTier === 'free' ? 'Landing' : 'Dashboard'}
          </button>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Start for free, upgrade when you need more
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const isCurrentPlan = !isLoggedOut && plan.type === currentTier;
            
            let ctaText = plan.cta;
            let buttonAction = () => {};
            let isDisabled = isCurrentPlan || loading !== null;

            if (isLoggedOut) {
              ctaText = 'Sign Up / Login';
              buttonAction = () => onAuthRequired!('signup');
              isDisabled = false;
            } else if (isCurrentPlan) {
              ctaText = 'Current Plan';
              isDisabled = true;
            } else {
              ctaText = plan.cta;
              buttonAction = () => handleUpgrade(plan.type as 'pro' | 'premium');
              isDisabled = loading === plan.type;
            }

            return (
              <div
                key={plan.name}
                className={`bg-white rounded-xl shadow-lg border-2 transition-all ${
                  plan.highlighted
                    ? 'border-blue-600 scale-105'
                    : isCurrentPlan
                    ? 'border-green-500'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-8">
                  {plan.highlighted && (
                    <div className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full mb-4">
                      Most Popular
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="inline-block px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full mb-4">
                      Current Plan
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={buttonAction}
                    disabled={isDisabled}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {loading === plan.type ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {plan.type !== 'free' && !isLoggedOut && <Zap className="w-5 h-5" />}
                        {ctaText}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated automatically.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I exceed my limits?
              </h3>
              <p className="text-gray-600">
                You'll receive a notification when approaching your limits. You can upgrade your plan to continue creating.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                Yes, we offer a 14-day money-back guarantee. Contact our support team if you're not satisfied.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel my subscription?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel anytime. You'll retain access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}