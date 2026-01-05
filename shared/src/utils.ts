// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * A simple concurrency limiter.
 * @param tasks An array of functions that return a Promise.
 * @param concurrency The maximum number of concurrent executions.
 * @returns A Promise that resolves when all tasks are completed.
 */
export async function runWithConcurrency<T>(
	tasks: (() => Promise<T>)[],
	concurrency: number,
): Promise<T[]> {
	const results: T[] = []
	const executing: Promise<void>[] = []

	for (const task of tasks) {
		const p = Promise.resolve().then(task)
		results.push(p as any) // We'll await all at the end, but we need to track execution

		// Wrap the promise to remove itself from the 'executing' list when done
		const e: Promise<void> = p.then(() => {
			executing.splice(executing.indexOf(e), 1)
		})
		executing.push(e)

		if (executing.length >= concurrency) {
			await Promise.race(executing)
		}
	}

	return Promise.all(results)
}
