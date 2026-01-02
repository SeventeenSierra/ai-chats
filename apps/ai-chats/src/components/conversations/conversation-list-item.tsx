// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Bot } from 'lucide-react'
import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'

type ConversationListItemProps = {
	conversation: Conversation
	isSelected: boolean
	onSelect: (conversation: Conversation) => void
	children?: React.ReactNode // For checkbox in grouped view
}

export function ConversationListItem({
	conversation,
	isSelected,
	onSelect,
	children,
}: ConversationListItemProps) {
	const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
		e.dataTransfer.setData(
			'application/json',
			JSON.stringify({
				conversationId: conversation.id,
				originalCategory: conversation.category || 'Unprocessed',
			}),
		)
		e.dataTransfer.effectAllowed = 'move'
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: complex interactive list item with nested interactive elements
		// biome-ignore lint/a11y/noStaticElementInteractions: see above
		<div
			className={cn(
				'flex items-start gap-3 p-2 rounded-md cursor-pointer', // w-full removed
				isSelected ? 'bg-muted' : 'hover:bg-muted/50',
			)}
			onClick={() => onSelect(conversation)}
			draggable="true"
			onDragStart={handleDragStart}
		>
			{children}
			<Bot className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
			<div className="flex flex-col min-w-0 flex-1">
				<p className={cn('text-sm', isSelected ? 'font-semibold text-primary' : 'font-medium')}>
					{conversation.title}
				</p>
				<div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
					<span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
					{conversation.hasRichContent && <Badge variant="secondary">Rich Content</Badge>}
				</div>
			</div>
		</div>
	)
}
