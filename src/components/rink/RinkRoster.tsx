// Top-down view of the ice with a slot for every spot of the session. Drawn in portrait
// coordinates (170 x 400 units, roughly 2 units per foot) and transposed for landscape.
import { useState } from 'react'
import { copy } from '@/lib/copy'
import { initials } from '@/features/profile/api'
import type { RosterRegistration } from '@/features/sessions/model'

const W = 170
const H = 400
const CORNER = 56
const GOAL_TOP = 22
const GOAL_BOTTOM = H - 22
const BLUE_TOP = 150
const BLUE_BOTTOM = 250
const CENTER = 200
const CREASE = 13

type Point = { x: number; y: number }
type Orientation = 'portrait' | 'landscape'

export interface RinkSlot {
  key: string
  kind: 'skater' | 'goalie'
  registration: RosterRegistration | null
}

export interface RinkRosterProps {
  skaterCapacity: number
  goalieSlots: number
  skaters: RosterRegistration[]
  goalies: RosterRegistration[]
  myUserId: string | null
  orientation: Orientation
  className?: string
}

/** Rows of a formation: evenly split, the longer rows in the middle. */
function rowSizes(count: number): number[] {
  if (count === 0) return []
  const rows = count <= 3 ? 1 : count <= 8 ? 2 : count <= 12 ? 3 : 4
  const base = Math.floor(count / rows)
  const extra = count % rows
  const sizes = Array.from({ length: rows }, () => base)
  const middle = Math.floor((rows - extra) / 2)
  for (let i = 0; i < extra; i++) sizes[middle + i]! += 1
  return sizes
}

function formation(count: number, top: number, bottom: number): { points: Point[]; radius: number } {
  const sizes = rowSizes(count)
  const left = 16
  const right = W - 16
  const widest = Math.max(1, ...sizes)
  const rowHeight = (bottom - top) / Math.max(1, sizes.length)
  const points: Point[] = []
  sizes.forEach((size, row) => {
    const cell = (right - left) / size
    for (let col = 0; col < size; col++) {
      points.push({ x: left + (col + 0.5) * cell, y: top + (row + 0.5) * rowHeight })
    }
  })
  const radius = Math.min(12.5, ((right - left) / widest) * 0.4, rowHeight * 0.4)
  return { points, radius }
}

function goaliePoints(slots: number): Point[] {
  const all: Point[] = [
    { x: W / 2, y: GOAL_TOP + 11 },
    { x: W / 2, y: GOAL_BOTTOM - 11 },
    { x: W / 2 + 34, y: GOAL_TOP + 16 },
    { x: W / 2 + 34, y: GOAL_BOTTOM - 16 },
  ]
  return all.slice(0, slots)
}

function arc(cx: number, cy: number, r: number, from: number, to: number): Point[] {
  const steps = 20
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / steps
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
}

export function RinkRoster({ skaterCapacity, goalieSlots, skaters, goalies, myUserId, orientation, className }: RinkRosterProps) {
  const t = (p: Point): Point => (orientation === 'portrait' ? p : { x: p.y, y: p.x })
  const width = orientation === 'portrait' ? W : H
  const height = orientation === 'portrait' ? H : W

  const topCount = Math.ceil(skaterCapacity / 2)
  const bottomCount = Math.floor(skaterCapacity / 2)
  const topHalf = formation(topCount, GOAL_TOP + 30, CENTER - 8)
  const bottomHalf = formation(bottomCount, CENTER + 8, GOAL_BOTTOM - 30)
  // Bottom half mirrors the top one so both teams face the center line.
  const bottomPoints = [...bottomHalf.points].reverse()
  const skaterRadius = Math.min(topHalf.radius, bottomHalf.radius || topHalf.radius)

  // Players alternate between halves in registration order.
  const skaterSlots = Array.from({ length: skaterCapacity }, (_, i) => {
    const point = i % 2 === 0 ? topHalf.points[i / 2] : bottomPoints[(i - 1) / 2]
    return { point: point!, registration: skaters[i] ?? null }
  })
  const goalieSlotsList = goaliePoints(goalieSlots).map((point, i) => ({ point, registration: goalies[i] ?? null }))

  const line = (a: Point, b: Point) => {
    const p = t(a)
    const q = t(b)
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
  }
  const polygon = (points: Point[]) => points.map((p) => `${t(p).x},${t(p).y}`).join(' ')
  const label = copy.sessions.occupancy(skaters.length, skaterCapacity, goalies.length, goalieSlots)
  // My slot animates only when I join while looking at the rink, not on every page load.
  const hasMine = [...skaters, ...goalies].some((r) => r.user_id === myUserId)
  const [hadMineInitially] = useState(hasMine)
  const animateMine = hasMine && !hadMineInitially

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className={className}>
      <title>{label}</title>
      <rect x="1.5" y="1.5" width={width - 3} height={height - 3} rx={CORNER} fill="var(--rink-ice)" stroke="var(--rink-boards)" strokeWidth="3" />
      {/* goal lines */}
      <line {...line({ x: 12, y: GOAL_TOP }, { x: W - 12, y: GOAL_TOP })} stroke="var(--rink-red)" strokeWidth="1.2" opacity="0.8" />
      <line {...line({ x: 12, y: GOAL_BOTTOM }, { x: W - 12, y: GOAL_BOTTOM })} stroke="var(--rink-red)" strokeWidth="1.2" opacity="0.8" />
      {/* goal creases */}
      <polygon points={polygon(arc(W / 2, GOAL_TOP, CREASE, 0, Math.PI))} fill="var(--rink-crease)" stroke="var(--rink-red)" strokeWidth="1" />
      <polygon points={polygon(arc(W / 2, GOAL_BOTTOM, CREASE, Math.PI, 2 * Math.PI))} fill="var(--rink-crease)" stroke="var(--rink-red)" strokeWidth="1" />
      {/* blue lines */}
      <line {...line({ x: 2, y: BLUE_TOP }, { x: W - 2, y: BLUE_TOP })} stroke="var(--rink-blue)" strokeWidth="4" />
      <line {...line({ x: 2, y: BLUE_BOTTOM }, { x: W - 2, y: BLUE_BOTTOM })} stroke="var(--rink-blue)" strokeWidth="4" />
      {/* center line and circle */}
      <line {...line({ x: 2, y: CENTER }, { x: W - 2, y: CENTER })} stroke="var(--rink-red)" strokeWidth="4" />
      <circle cx={t({ x: W / 2, y: CENTER }).x} cy={t({ x: W / 2, y: CENTER }).y} r="30" fill="none" stroke="var(--rink-blue)" strokeWidth="1.2" opacity="0.7" />

      {skaterSlots.map(({ point, registration }, i) => (
        <Slot
          key={registration ? `u-${registration.user_id}` : `s-${i}`}
          point={t(point)}
          radius={skaterRadius}
          kind="skater"
          registration={registration}
          mine={registration?.user_id === myUserId}
          animate={animateMine}
        />
      ))}
      {goalieSlotsList.map(({ point, registration }, i) => (
        <Slot
          key={registration ? `u-${registration.user_id}` : `g-${i}`}
          point={t(point)}
          radius={12.5}
          kind="goalie"
          registration={registration}
          mine={registration?.user_id === myUserId}
          animate={animateMine}
        />
      ))}
    </svg>
  )
}

function Slot({
  point,
  radius,
  kind,
  registration,
  mine,
  animate,
}: {
  point: Point
  radius: number
  kind: 'skater' | 'goalie'
  registration: RosterRegistration | null
  mine: boolean
  animate: boolean
}) {
  if (!registration) {
    return (
      <circle
        cx={point.x}
        cy={point.y}
        r={radius - 1}
        fill="none"
        stroke={kind === 'goalie' ? 'var(--goalie-fill)' : 'var(--slot-empty)'}
        strokeWidth="1.5"
        strokeDasharray={kind === 'goalie' ? '3 2.5' : undefined}
      />
    )
  }
  const jersey = registration.profile?.jersey_number
  const text = jersey != null ? String(jersey) : initials(registration.profile?.full_name ?? '')
  const fill = mine ? 'var(--slot-mine)' : kind === 'goalie' ? 'var(--goalie-fill)' : 'var(--slot-taken)'
  const textColor = mine ? 'var(--slot-mine-text)' : kind === 'goalie' ? 'var(--goalie-foreground)' : 'var(--slot-taken-text)'
  return (
    <g className={mine && animate ? 'rink-slot-enter' : undefined}>
      <circle cx={point.x} cy={point.y} r={radius} fill={fill} stroke={mine && kind === 'goalie' ? 'var(--goalie-fill)' : 'none'} strokeWidth="2.5" />
      <text
        x={point.x}
        y={point.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={radius * (jersey != null ? 1.05 : 0.85)}
        fontWeight={750}
        style={{ fontStretch: '72%' }}
      >
        {text}
      </text>
    </g>
  )
}
