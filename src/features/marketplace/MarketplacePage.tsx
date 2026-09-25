import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { FormField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ListSkeleton } from '@/features/sessions/GroupSessionsTab'
import { useMarketplace, useMarketplaceCities, type MarketplaceFilters } from '@/features/marketplace/api'
import { postPriceText } from '@/features/marketplace/postText'
import { copy } from '@/lib/copy'
import { formatDayShort, formatTime } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export function MarketplacePage() {
  const [filters, setFilters] = useState<MarketplaceFilters>({ city: '', dateFrom: '', role: '' })
  const posts = useMarketplace(filters)
  const cities = useMarketplaceCities()

  return (
    <div>
      <PageHeader title={copy.marketplace.title} subtitle={copy.marketplace.intro} />
      <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-[1fr_1fr_auto]">
        <FormField id="mk-city" label={copy.marketplace.city}>
          {(c) => (
            <NativeSelect {...c} value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}>
              <option value="">{copy.marketplace.allCities}</option>
              {cities.data?.map(({ city }) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="mk-date" label={copy.marketplace.date}>
          {(c) => <Input {...c} type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />}
        </FormField>
        <fieldset className="col-span-2 sm:col-span-1">
          <legend className="mb-1.5 text-sm font-semibold">{copy.marketplace.role}</legend>
          <ToggleGroup
            type="single"
            value={filters.role || 'any'}
            onValueChange={(value) => value && setFilters((f) => ({ ...f, role: value === 'any' ? '' : (value as 'skater' | 'goalie') }))}
          >
            <ToggleGroupItem value="any">{copy.marketplace.anyRole}</ToggleGroupItem>
            <ToggleGroupItem value="skater">{copy.marketplace.skater}</ToggleGroupItem>
            <ToggleGroupItem value="goalie">{copy.marketplace.goalie}</ToggleGroupItem>
          </ToggleGroup>
        </fieldset>
      </div>

      {posts.isPending ? (
        <ListSkeleton />
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : posts.data.length === 0 ? (
        <EmptyState title={copy.marketplace.empty} />
      ) : (
        <ul>
          {posts.data.map((post) => {
            const price = postPriceText(post)
            return (
              <li key={post.post_id} className="border-t border-border">
                <Link to={`/burza/${post.post_id}`} className="group flex items-center gap-3 py-3 hover:bg-surface-2/60 sm:gap-4 sm:px-2">
                  <div className="w-24 shrink-0">
                    <div className="font-display text-xl leading-tight">{formatTime(post.starts_at)}</div>
                    <div className="text-sm text-muted-foreground">{formatDayShort(post.starts_at)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{post.group_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {post.city}, {post.venue}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {post.free_skater_spots != null && post.free_skater_spots > 0 && <Badge>{copy.marketplace.freeSkaters(post.free_skater_spots)}</Badge>}
                      {post.free_goalie_spots != null && post.free_goalie_spots > 0 && (
                        <Badge variant="goalie">
                          {copy.marketplace.freeGoalies(post.free_goalie_spots)}
                          {post.goalie_fee_cents ? `, odmena ${formatMoney(post.goalie_fee_cents, post.currency)}` : ''}
                        </Badge>
                      )}
                      {post.is_member && <Badge variant="outline">{copy.marketplace.yourGroup}</Badge>}
                    </div>
                    {price && post.offer_skaters && (
                      <div className="mt-1 text-sm">
                        {copy.marketplace.price}: <span className="font-semibold">{price}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
