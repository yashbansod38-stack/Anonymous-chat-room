import { APP_NAME } from "@/config/constants";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-gray-200/60 bg-white/50 dark:border-gray-800/60 dark:bg-surface-darker/50">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        &copy; {currentYear} {APP_NAME}. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <a
                            href="#"
                            className="text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                        >
                            Privacy
                        </a>
                        <a
                            href="#"
                            className="text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                        >
                            Terms
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
