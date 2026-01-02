// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState(false)

	React.useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		const handleResize = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		}

		handleResize()
		window.addEventListener('resize', handleResize)

		return () => window.removeEventListener('resize', handleResize)
	}, [])

	return isMobile
}
