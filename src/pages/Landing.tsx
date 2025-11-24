import { BookOpen, Palette, Download, Zap, CheckCircle } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">KDP Coloring Books</span>
          </div>
          <button
            onClick={onGetStarted}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View Pricing
          </button>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Create Professional Coloring Books for Amazon KDP
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Generate beautiful coloring books with AI-powered illustrations. Perfect for publishers, artists, and entrepreneurs.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
          >
            <Zap className="w-6 h-6" />
            View Pricing Plans
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Palette className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Generation</h3>
            <p className="text-gray-600">
              Create unique coloring pages with advanced AI models. Generate custom illustrations based on your prompts.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">KDP Ready Format</h3>
            <p className="text-gray-600">
              Export your books in perfect KDP format with proper trim sizes, margins, and specifications.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Easy Export</h3>
            <p className="text-gray-600">
              Download your completed books as high-quality PDFs ready for immediate upload to Amazon KDP.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">How It Works</h2>
            <div className="space-y-6 text-left">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Create Your Book</h4>
                  <p className="text-blue-100">Set your title, author name, and choose your KDP trim size</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Generate Pages</h4>
                  <p className="text-blue-100">Use AI to create beautiful coloring page illustrations with custom prompts</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Export & Publish</h4>
                  <p className="text-blue-100">Download your book as a KDP-ready PDF and upload to Amazon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Perfect for KDP Publishers</h2>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-gray-700">Create multiple coloring books faster than ever before</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-gray-700">Generate unique content that stands out in the marketplace</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-gray-700">Perfect trim sizes for Amazon KDP specifications</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-gray-700">Simple, clean line art ideal for coloring</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Create Your First Book?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join creators who are publishing amazing coloring books on Amazon KDP
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
          >
            View Pricing Plans
          </button>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>KDP Coloring Books - Create beautiful coloring books for Amazon KDP</p>
        </div>
      </footer>
    </div>
  );
}