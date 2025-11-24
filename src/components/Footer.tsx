import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FooterProps {
  onPageClick: (slug: string) => void;
}

interface FooterLink {
  slug: string;
  title: string;
}

export default function Footer({ onPageClick }: FooterProps) {
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);

  useEffect(() => {
    loadFooterLinks();
  }, []);

  const loadFooterLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('static_pages')
        .select('slug, title')
        .eq('is_published', true)
        .contains('display_location', ['footer'])
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFooterLinks(data || []);
    } catch (error) {
      console.error('Error loading footer links:', error);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">KDP Coloring Books Creator</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Create professional coloring books for Amazon KDP with AI-powered design tools.
              Easy, fast, and beautiful results every time.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => window.location.reload()}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Home
                </button>
              </li>
              <li>
                <a
                  href="mailto:support@example.com"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.slug}>
                  <button
                    onClick={() => onPageClick(link.slug)}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {currentYear} KDP Coloring Books Creator. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
