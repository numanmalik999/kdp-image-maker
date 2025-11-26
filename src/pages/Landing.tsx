import { BookOpen, Download, Zap, Brain, FileText } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

export default function Landing({ onGetStarted, onSignIn, onSignUp }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">KDP Book Builder</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Sign In
            </button>
            <button
              onClick={onSignUp}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            The Fastest Way to Publish <span className="text-blue-600">AI-Generated Coloring Books</span> on KDP
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Generate unique, high-quality coloring pages, tracing activities, and story content, all formatted perfectly for Amazon KDP.
          </p>
          <p className="text-2xl font-semibold text-purple-700 mb-10">
            Bring your own API keys and start creating books today!
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-3 px-10 py-4 bg-blue-600 text-white text-xl rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-xl transform hover:scale-[1.02]"
          >
            <Zap className="w-6 h-6" />
            Start Creating for Free
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 bg-white">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Features Built for KDP Success</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Advanced AI Generation</h3>
            <p className="text-gray-600">
              Utilize DALL-E 3 and GPT-4o/Gemini models to create custom line art, mazes, dot-to-dots, and story content based on your prompts.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Flexible Page Activities</h3>
            <p className="text-gray-600">
              Mix and match coloring pages, tracing practice, and story text within a single book structure, maximizing market appeal.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">KDP-Ready Export</h3>
            <p className="text-gray-600">
              Download high-resolution PDFs with correct trim sizes (8.5x11, 6x9, 5x8) and margins, ready for immediate upload to Amazon.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Your Publishing Workflow, Simplified</h2>
            <div className="space-y-6 text-left">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold mt-1">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-1">Configure & Prompt</h4>
                  <p className="text-blue-100">Set your book size and provide a simple description of your concept.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold mt-1">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-1">Generate Content & Images</h4>
                  <p className="text-blue-100">Use AI to fill your pages with custom illustrations, puzzles, or story text.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold mt-1">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-xl mb-1">Review, Edit, and Export</h4>
                  <p className="text-blue-100">Fine-tune pages with the built-in editor, then export your KDP-ready PDF.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Launch Your Next Bestseller?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join the future of low-content publishing today.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-3 px-10 py-4 bg-blue-600 text-white text-xl rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-lg"
          >
            <Zap className="w-6 h-6" />
            Get Started Now
          </button>
        </div>
      </section>
    </div>
  );
}