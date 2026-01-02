// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { listFromStorage, pool } from '@ai-chat/backend'
import { NextResponse } from 'next/server'

export async function GET() {
	const status: Record<string, any> = {
		app: 'ok',
	}

	try {
		// Check database
		await pool.query('SELECT 1')
		status.database = 'ok'
	} catch (error) {
		console.error('Database health check failed:', error)
		status.database = 'error'
		status.database_error = error instanceof Error ? error.message : String(error)
	}

	try {
		// Check storage - using backend's exported function to avoid direct SDK dependency
		await listFromStorage('health-check')
		status.storage = 'ok'
	} catch (error) {
		console.error('Storage health check failed:', error)
		status.storage = 'error'
		status.storage_error = error instanceof Error ? error.message : String(error)
	}

	const isHealthy = status.database === 'ok' && status.storage === 'ok'

	return NextResponse.json(status, { status: isHealthy ? 200 : 503 })
}
