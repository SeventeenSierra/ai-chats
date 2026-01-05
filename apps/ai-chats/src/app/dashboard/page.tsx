// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import {
	Activity,
	BarChart,
	BrainCircuit,
	Folder,
	MessageSquare,
	PieChart,
	ShieldAlert,
} from 'lucide-react'
import * as React from 'react'
import { ConversationCharts } from '@/components/dashboard/charts'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import AppHeader from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { wipeDataAction } from '@/lib/actions'
import type { AppCategory, Conversation } from '@/types'

function StatCard({
	title,
	value,
	icon,
	loading,
}: {
	title: string
	value: string | number
	icon: React.ReactNode
	loading: boolean
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				{icon}
			</CardHeader>
			<CardContent>
				{loading ? (
					<Skeleton className="h-8 w-1/4" />
				) : (
					<div className="text-2xl font-bold">{value}</div>
				)}
			</CardContent>
		</Card>
	)
}

export default function DashboardPage() {
	const [isWiping, setIsWiping] = React.useState(false)
	const [conversations, setConversations] = React.useState<Conversation[]>([])
	const [quarantinedCount, setQuarantinedCount] = React.useState(0)
	const [categories, setCategories] = React.useState<AppCategory[]>([])
	const [isLoading, setIsLoading] = React.useState(true)
	const [isPipelineOpen, setIsPipelineOpen] = React.useState(false)

	const { toast } = useToast()

	const fetchDashboardData = React.useCallback(async () => {
		setIsLoading(true)
		try {
			const res = await fetch('/api/dashboard')
			if (!res.ok) throw new Error('Failed to fetch dashboard data')
			const data = await res.json()
			setConversations(data.conversations)
			setQuarantinedCount(data.quarantinedCount)
			setCategories(data.categories)
		} catch (error) {
			console.error('Failed to fetch dashboard data:', error)
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Could not fetch dashboard data.',
			})
		} finally {
			setIsLoading(false)
		}
	}, [toast])

	React.useEffect(() => {
		fetchDashboardData()
	}, [fetchDashboardData])

	const dashboardStats = React.useMemo(() => {
		const total = conversations.length
		const summarized = conversations.filter((c) => c.summary).length
		const uncategorized = conversations.filter(
			(c) => !c.category || c.category === 'Unprocessed',
		).length
		return { total, summarized, uncategorized }
	}, [conversations])

	const handleWipe = async () => {
		setIsWiping(true)
		try {
			const result = await wipeDataAction()
			if (result.success) {
				toast({ title: 'Success', description: 'All data has been wiped.' })
				await fetchDashboardData() // Re-fetch to clear everything
			} else {
				throw new Error(result.message)
			}
		} catch (error) {
			console.error('Wipe data error:', error)
			toast({ variant: 'destructive', title: 'Error', description: 'Failed to wipe data.' })
		} finally {
			setIsWiping(false)
		}
	}

	return (
		<div className="flex flex-col h-screen w-screen bg-muted/40">
			<AppHeader
				onWipe={handleWipe}
				_isWiping={isWiping}
				_isJobRunning={false}
				isPipelineOpen={isPipelineOpen}
				setPipelineOpen={setIsPipelineOpen}
			/>
			<main className="flex-grow p-4 md:p-8 overflow-y-auto">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Total Conversations"
						value={dashboardStats.total}
						icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
						loading={isLoading}
					/>
					<StatCard
						title="Summarized"
						value={dashboardStats.summarized}
						icon={<BrainCircuit className="h-4 w-4 text-muted-foreground" />}
						loading={isLoading}
					/>
					<StatCard
						title="Uncategorized"
						value={dashboardStats.uncategorized}
						icon={<Folder className="h-4 w-4 text-muted-foreground" />}
						loading={isLoading}
					/>
					<StatCard
						title="Quarantined"
						value={quarantinedCount}
						icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
						loading={isLoading}
					/>
				</div>
				<div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
					<Card className="lg:col-span-4">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BarChart className="h-5 w-5" />
								Conversations Last 7 Days
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ConversationCharts
								type="activity"
								conversations={conversations}
								loading={isLoading}
							/>
						</CardContent>
					</Card>
					<Card className="lg:col-span-3">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<PieChart className="h-5 w-5" />
								Category Distribution
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ConversationCharts
								type="category"
								conversations={conversations}
								categories={categories}
								loading={isLoading}
							/>
						</CardContent>
					</Card>
				</div>
				<div className="mt-8">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Activity className="h-5 w-5" />
								Recent Activity
							</CardTitle>
							<CardDescription>A timeline of your most recent actions in the app.</CardDescription>
						</CardHeader>
						<CardContent>
							<RecentActivity conversations={conversations} loading={isLoading} />
						</CardContent>
					</Card>
				</div>
			</main>
			<Toaster />
		</div>
	)
}
