'use client'

import { Waypoints } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SidebarPipelineStatusProps = {
	onClick: () => void
	isRunning?: boolean
	statusLabel?: string
}

export function SidebarPipelineStatus({
	onClick,
	isRunning = false,
	statusLabel = 'Pipeline',
}: SidebarPipelineStatusProps) {
	return (
		<div className="px-3 py-1">
			<Button
				variant={isRunning ? 'secondary' : 'ghost'}
				className="w-full justify-start gap-2 text-sm font-normal"
				onClick={onClick}
			>
				<Waypoints
					className={`h-4 w-4 ${isRunning ? 'animate-pulse text-blue-500' : 'text-muted-foreground'}`}
				/>
				<span className={isRunning ? 'font-medium' : 'text-muted-foreground'}>
					{isRunning ? 'Processing...' : statusLabel}
				</span>
			</Button>
		</div>
	)
}
