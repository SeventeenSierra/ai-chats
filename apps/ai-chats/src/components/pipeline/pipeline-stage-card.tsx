// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type PipelineStageCardProps = {
	title: string
	description: string
	status: 'pending' | 'complete'
	isDisabled?: boolean
	children: React.ReactNode
}

export function PipelineStageCard({
	title,
	description,
	status,
	isDisabled = false,
	children,
}: PipelineStageCardProps) {
	return (
		<Card className={cn(isDisabled && 'bg-muted/50 border-dashed')}>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-xl font-headline">{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	)
}

export function PipelineStageCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/2" />
				<Skeleton className="h-4 w-3/4" />
			</CardHeader>
			<CardContent>
				<div className="flex justify-between items-center">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>
			</CardContent>
		</Card>
	)
}
