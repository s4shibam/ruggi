import { createFileRoute } from '@tanstack/react-router'
import { Crown, FileText, MessageSquare, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetUsage } from '@/hooks/api/user'
import { cn } from '@/lib/utils'

const UsagePage = () => {
  const { data: response, isLoading, error } = useGetUsage(undefined)

  const usageData = response?.data
  const isPro = usageData?.plan_type === 'pro'
  const planLabel = isPro ? 'Pro' : 'Free'
  const resetLabel = isPro ? 'Monthly' : 'Lifetime'

  return (
    <div className="flex h-full flex-1 justify-center overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-1 flex-col gap-6 p-2 sm:p-4">
        <div className="space-y-1">
          <h2 className="font-bold text-xl sm:text-2xl">Usage & Limits</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Track your plan usage and remaining limits</p>
        </div>

        {isLoading && <UsageSkeleton />}

        {!isLoading && (error || !usageData) && <UsageErrorMessage errorMessage={error?.message} />}

        {!isLoading && usageData && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent/25 p-2">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Documents</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{resetLabel} limit</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-4xl">{usageData.documents.used}</span>
                    <span className="text-muted-foreground text-sm">of {usageData.documents.total}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          usageData.documents.percentage_used >= 90
                            ? 'bg-destructive'
                            : usageData.documents.percentage_used >= 75
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                        )}
                        style={{ width: `${Math.min(usageData.documents.percentage_used, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{usageData.documents.remaining} remaining</span>
                      <span className="font-medium">{usageData.documents.percentage_used.toFixed(1)}%</span>
                    </div>
                  </div>

                  {usageData.documents.remaining === 0 ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                      <p className="font-medium text-destructive text-sm">Limit reached</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {isPro
                          ? 'Your limit will reset at the start of next month.'
                          : 'Upgrade to Pro for more uploads.'}
                      </p>
                    </div>
                  ) : usageData.documents.percentage_used >= 75 ? (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                      <p className="font-medium text-sm text-yellow-700">Running low</p>
                      <p className="mt-1 text-muted-foreground text-xs">You're approaching your document limit.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent/25 p-2">
                      <MessageSquare className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Chat Messages</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{resetLabel} limit</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-4xl">{usageData.chats.used}</span>
                    <span className="text-muted-foreground text-sm">of {usageData.chats.total}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          usageData.chats.percentage_used >= 90
                            ? 'bg-destructive'
                            : usageData.chats.percentage_used >= 75
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                        )}
                        style={{ width: `${Math.min(usageData.chats.percentage_used, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{usageData.chats.remaining} remaining</span>
                      <span className="font-medium">{usageData.chats.percentage_used.toFixed(1)}%</span>
                    </div>
                  </div>

                  {usageData.chats.remaining === 0 ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                      <p className="font-medium text-destructive text-sm">Limit reached</p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {isPro
                          ? 'Your limit will reset at the start of next month.'
                          : 'Upgrade to Pro to continue chatting.'}
                      </p>
                    </div>
                  ) : usageData.chats.percentage_used >= 75 ? (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                      <p className="font-medium text-sm text-yellow-700">Running low</p>
                      <p className="mt-1 text-muted-foreground text-xs">You're approaching your chat limit.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/25 p-2">
                    <TrendingUp className="size-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Plan Information</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Details about your current plan</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-1 font-medium text-sm">Current Plan</p>
                    <p className="font-bold text-lg sm:text-xl">{planLabel}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-1 font-medium text-sm">Reset Type</p>
                    <p className="font-bold text-lg sm:text-xl">{resetLabel}</p>
                  </div>
                </div>

                {usageData.last_reset_at && isPro && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-1 font-medium text-sm">Last Reset</p>
                    <p className="text-muted-foreground text-sm">
                      {new Date(usageData.last_reset_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {!isPro && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <Crown className="mt-0.5 size-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">Upgrade to Pro</p>
                        <p className="mt-1 text-muted-foreground text-sm">
                          Get 75 documents and 750 chat messages every month with Pro plan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/lab/usage')({
  component: UsagePage
})

const UsageSkeleton = () => {
  return (
    <>
      <div className="flex items-center justify-end">
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

const UsageErrorMessage = ({ errorMessage }: { errorMessage?: string }) => (
  <Card className="w-full">
    <CardContent className="px-4 py-4 text-center sm:px-6 sm:py-8">
      <p className="text-muted-foreground">{errorMessage || 'Failed to load usage data. Please try again.'}</p>
    </CardContent>
  </Card>
)
