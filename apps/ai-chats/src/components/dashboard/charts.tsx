// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { format, startOfDay, subDays } from 'date-fns'
import * as React from 'react'
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { AppCategory, Conversation } from '@/types'

type ChartProps = {
	type: 'activity' | 'category'
	conversations: Conversation[]
	categories?: AppCategory[]
	loading: boolean
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
// Define a simpler interface for the tooltip props to avoid complex Recharts generics
interface CustomTooltipProps {
	active?: boolean
	payload?: Array<{ value: number }>
	label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
	if (active && payload && payload.length > 0) {
		return (
			<div className="rounded-lg border bg-background p-2 shadow-sm">
				<p className="font-bold text-foreground">{label}</p>
				<p className="text-sm text-muted-foreground">
					Conversations: <span className="font-bold">{payload[0].value}</span>
				</p>
			</div>
		)
	}
	return null
}

export function ConversationCharts({ type, conversations, loading }: ChartProps) {
	const activityData = React.useMemo(() => {
		const today = startOfDay(new Date())
		const data = Array.from({ length: 7 })
			.map((_, i) => {
				const date = subDays(today, i)
				return {
					name: format(date, 'MMM d'),
					date,
					total: 0,
				}
			})
			.reverse()

		conversations.forEach((convo) => {
			const convoDate = startOfDay(new Date(convo.createdAt))
			const dayData = data.find((d) => d.date.getTime() === convoDate.getTime())
			if (dayData) {
				dayData.total += 1
			}
		})

		return data
	}, [conversations])

	const categoryData = React.useMemo(() => {
		const categorized = conversations.filter((c) => c.category && c.category !== 'Unprocessed')
		const counts: Record<string, number> = {}

		categorized.forEach((convo) => {
			if (convo.category) {
				counts[convo.category] = (counts[convo.category] || 0) + 1
			}
		})

		return Object.entries(counts)
			.map(([name, value]) => ({ name, value }))
			.sort((a, b) => b.value - a.value) // Sort for consistent pie chart layout
			.slice(0, 7) // Show top 7 categories
	}, [conversations])

	if (loading) {
		return <Skeleton className="w-full h-[350px]" />
	}

	if (type === 'activity') {
		return (
			<ResponsiveContainer width="100%" height={350}>
				<BarChart data={activityData}>
					<XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
					<YAxis
						stroke="#888888"
						fontSize={12}
						tickLine={false}
						axisLine={false}
						tickFormatter={(value) => `${value}`}
					/>
					<Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
					<Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
				</BarChart>
			</ResponsiveContainer>
		)
	}

	if (type === 'category') {
		if (categoryData.length === 0) {
			return (
				<div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
					No categorized conversations to display.
				</div>
			)
		}
		return (
			<ResponsiveContainer width="100%" height={350}>
				<PieChart>
					<Pie
						data={categoryData}
						dataKey="value"
						nameKey="name"
						cx="50%"
						cy="50%"
						outerRadius={100}
						labelLine={false}
						label={(props: {
							cx: number
							cy: number
							midAngle?: number
							innerRadius?: number
							outerRadius: number
							percent?: number
							index: number
						}) => {
							const {
								cx,
								cy,
								midAngle = 0,
								innerRadius = 0,
								outerRadius,
								percent = 0,
								index,
							} = props
							const radius = innerRadius + (outerRadius - innerRadius) * 1.2
							const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180)
							const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180)
							return (
								<text
									x={x}
									y={y}
									fill="currentColor"
									textAnchor={x > cx ? 'start' : 'end'}
									dominantBaseline="central"
									className="text-xs"
								>
									{`${categoryData[index].name} (${(percent * 100).toFixed(0)}%)`}
								</text>
							)
						}}
					>
						{categoryData.map((entry, index) => (
							<Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
						))}
					</Pie>
					<Tooltip content={<CustomTooltip />} />
				</PieChart>
			</ResponsiveContainer>
		)
	}

	return null
}
