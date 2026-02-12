import { APP_NAME } from "@/config/constants";

export default function AboutPage() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
                <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                    About {APP_NAME}
                </h1>

                <div className="space-y-6 text-gray-600 dark:text-gray-400">
                    <p className="text-lg leading-relaxed">
                        {APP_NAME} is a privacy-first, anonymous real-time chat platform.
                        We believe everyone deserves a safe space to communicate freely
                        without surveillance or data collection.
                    </p>

                    <div className="card">
                        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                            Our Principles
                        </h2>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                                <span><strong className="text-gray-900 dark:text-white">No accounts required</strong> — Start chatting instantly with a random identity.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                                <span><strong className="text-gray-900 dark:text-white">Ephemeral messages</strong> — Conversations are not stored permanently.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                                <span><strong className="text-gray-900 dark:text-white">Open & transparent</strong> — Built with modern, open-source technologies.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="card">
                        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                            Tech Stack
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {["Next.js 14", "TypeScript", "Tailwind CSS", "Firebase", "App Router"].map(
                                (tech) => (
                                    <span
                                        key={tech}
                                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    >
                                        {tech}
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
