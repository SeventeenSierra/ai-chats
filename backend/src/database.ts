// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { Pool } from 'pg'

let _pool: Pool | null = null

function getPool(): Pool {
	if (!_pool) {
		if (!process.env.DATABASE_URL) {
			throw new Error('DATABASE_URL is not defined in environment variables')
		}
		_pool = new Pool({
			connectionString: process.env.DATABASE_URL,
		})
	}
	return _pool
}

// Export a proxy that lazily initializes the pool
export const pool = new Proxy({} as Pool, {
	get(_, prop) {
		const actualPool = getPool()
		const value = actualPool[prop as keyof Pool]
		if (typeof value === 'function') {
			return value.bind(actualPool)
		}
		return value
	},
})

