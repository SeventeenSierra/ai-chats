// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { formatDistanceToNow } from 'date-fns'
import { BrainCircuit, Folder, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Conversation } from '@/types'

type ActivityEvent = {
	id: string
	type: 'created' | 'summarized' | 'categorized'
	date: string
	conversation: Conversation
}

type RecentActivityProps = {
	conversations: Conversation[]
	loading: boolean
}

const EventIcon = ({ type }: { type: ActivityEvent['type'] }) => {
	switch (type) {
		case 'created':
			return <MessageSquare className="h-4 w-4 text-muted-foreground" />
		case 'summarized':
			return <BrainCircuit className="h-4 w-4 text-muted-foreground" />
		case 'categorized':
			return <Folder className="h-4 w-4 text-muted-foreground" />
		default:
			return null
	}
}

const EventText = ({ event }: { event: ActivityEvent }) => {
	const { type, conversation } = event
	const title = (
		<Link href="/explorer" className="font-medium hover:underline">
			{conversation.title}
		</Link>
	)

	switch (type) {
		case 'created':
			return <>New conversation {title} was imported.</>
		case 'summarized':
			return <>{title} was summarized.</>
		case 'categorized':
			return (
				<>
					{title} was moved to the "{conversation.category}" category.
				</>
			)
		default:
			return null
	}
}

export function RecentActivity({ conversations, loading }: RecentActivityProps) {
	const recentEvents = React.useMemo(() => {
		const events: ActivityEvent[] = []
		conversations.forEach((convo) => {
			// Created event
			events.push({
				id: `${convo.id}-created`,
				type: 'created',
				date: convo.createdAt,
				conversation: convo,
			})
			// Summarized event
			if (convo.summarizedAt) {
				events.push({
					id: `${convo.id}-summarized`,
					type: 'summarized',
					date: convo.summarizedAt,
					conversation: convo,
				})
			}
			// Categorized event
			if (convo.categorizedAt) {
				events.push({
					id: `${convo.id}-categorized`,
					type: 'categorized',
					date: convo.categorizedAt,
					conversation: convo,
				})
			}
		})

		return events
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 7) // Show the 7 most recent events
	}, [conversations])

	if (loading) {
		return (
			<div className="space-y-4">
				{[...Array(5)].map((_, i) => (
					<div key={i} className="flex items-center gap-4">
						<Skeleton className="h-8 w-8 rounded-full" />
						<div className="flex-1 space-y-1">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
						</div>
					</div>
				))}
			</div>
		)
	}

	if (recentEvents.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p>No activity yet.</p>
				<p>Use the Pipeline in the header to import your data.</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{recentEvents.map((event) => (
				<div key={event.id} className="flex items-start gap-4">
					<div className="p-2 bg-muted rounded-full mt-1">
						<EventIcon type={event.type} />
					</div>
					<div className="flex-1">
						<div className="text-sm">
							<EventText event={event} />
						</div>
						<div className="text-xs text-muted-foreground mt-1">
							<span>{formatDistanceToNow(new Date(event.date), { addSuffix: true })}</span>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
