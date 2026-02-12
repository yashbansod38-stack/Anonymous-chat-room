import Link from "next/link";
import Button from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/5" />
        <div className="absolute -bottom-40 left-0 h-[500px] w-[500px] rounded-full bg-accent-500/10 blur-3xl dark:bg-accent-500/5" />
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            End-to-end encrypted
          </div>

          {/* Heading */}
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
            Chat Anonymously.
            <span className="gradient-text block">Stay Safe.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400 sm:text-xl">
            Join secure, anonymous chat rooms with no sign-up required. Your
            privacy is our priority — conversations are ephemeral and
            encrypted.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/chat">
              <Button size="lg" className="w-full sm:w-auto">
                Start Chatting
                <svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="card group">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-transform group-hover:scale-110 dark:bg-primary-950 dark:text-primary-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Fully Anonymous
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              No sign-up, no personal data. Jump into conversations with a randomly generated identity.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card group">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-600 transition-transform group-hover:scale-110 dark:bg-accent-950 dark:text-accent-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Real-Time Messaging
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Powered by Firebase Firestore for instant, real-time message delivery across all connected clients.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card group sm:col-span-2 lg:col-span-1">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-transform group-hover:scale-110 dark:bg-violet-950 dark:text-violet-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Works Everywhere
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Mobile-first responsive design that works seamlessly on phones, tablets, and desktops.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
