"use client";

import { Ban } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
                <Ban className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                    {error.message || "An unexpected error occurred. Please try again."}
                </p>
            </div>
            <button
                onClick={() => reset()}
                className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
            >
                Try again
            </button>
        </div>
    );
}
