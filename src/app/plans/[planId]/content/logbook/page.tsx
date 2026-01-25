"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Filter,
  Loader2,
  ArrowLeft,
  Search,
  X,
  Image as ImageIcon,
  Link2,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformIcon } from "@/components/content/platform-icon";
import { PostDetailModal } from "@/components/content/post-detail-modal";
import {
  usePostsWithDetails,
  useGoals,
  useAccountsWithPlatform,
} from "@/features/content/hooks";
import type { ContentPostWithDetails } from "@/lib/supabase/types";

// ============================================================================
// CONSTANTS
// ============================================================================

const ITEMS_PER_PAGE = 20;

// ============================================================================
// POST CARD COMPONENT
// ============================================================================

interface LogbookPostCardProps {
  post: ContentPostWithDetails;
  onClick: () => void;
}

function LogbookPostCard({ post, onClick }: LogbookPostCardProps) {
  // Count distributions by platform
  const platformCounts = post.distributions?.reduce(
    (acc, dist) => {
      const platformId = dist.account?.platform?.id || "unknown";
      const platformName = dist.account?.platform?.name || "blog";
      if (!acc[platformId]) {
        acc[platformId] = { name: platformName, count: 0 };
      }
      acc[platformId].count += 1;
      return acc;
    },
    {} as Record<string, { name: string; count: number }>
  ) || {};

  const platforms = Object.values(platformCounts);
  const totalDistributions = post.distribution_count || 0;
  const postedCount = post.posted_count || 0;

  return (
    <div
      className="p-4 hover:bg-bg-1 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-body truncate">
            {post.title || "Untitled Post"}
          </h4>
          {post.description && (
            <p className="text-body-sm text-text-muted line-clamp-1 mt-0.5">
              {post.description}
            </p>
          )}

          {/* Goals */}
          {post.goals && post.goals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.goals.map((goal) => (
                <Badge
                  key={goal.id}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{
                    borderColor: goal.color || undefined,
                    color: goal.color || undefined,
                  }}
                >
                  {goal.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata Row */}
          <div className="flex items-center gap-4 mt-2 text-text-muted text-small">
            {/* Media count */}
            {post.media && post.media.length > 0 && (
              <div className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                <span>{post.media.length}</span>
              </div>
            )}

            {/* Links count */}
            {post.links && post.links.length > 0 && (
              <div className="flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                <span>{post.links.length}</span>
              </div>
            )}

            {/* Distribution count */}
            {totalDistributions > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <Send className="w-3 h-3" />
                <span>
                  {postedCount}/{totalDistributions} posted
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Platform icons */}
        <div className="flex items-center gap-2">
          {platforms.slice(0, 4).map((platform, index) => (
            <div key={index} className="relative">
              <PlatformIcon platformName={platform.name} size="sm" />
              {platform.count > 1 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-accent text-white text-[9px] font-medium rounded-full flex items-center justify-center px-0.5">
                  {platform.count}
                </span>
              )}
            </div>
          ))}
          {platforms.length > 4 && (
            <span className="text-small text-text-muted">
              +{platforms.length - 4}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function ContentLogbookPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);

  // Data hooks
  const { data: posts, isLoading } = usePostsWithDetails(planId);
  const { data: goals = [] } = useGoals(planId);
  const { data: accounts = [] } = useAccountsWithPlatform(planId);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [goalFilter, setGoalFilter] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState(1);

  // Modal state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter for completed posts only
  const completedPosts = useMemo(() => {
    if (!posts) return [];

    return posts
      .filter((post) => post.status === "complete")
      .filter((post) => {
        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const titleMatch = post.title?.toLowerCase().includes(searchLower);
          const descMatch = post.description?.toLowerCase().includes(searchLower);
          if (!titleMatch && !descMatch) return false;
        }

        // Goal filter
        if (goalFilter) {
          const postGoalIds = post.goals?.map((g) => g.id) || [];
          if (!postGoalIds.includes(goalFilter)) return false;
        }

        // Account filter
        if (accountFilter) {
          const postAccountIds = post.distributions?.map((d) => d.account_id) || [];
          if (!postAccountIds.includes(accountFilter)) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [posts, search, goalFilter, accountFilter]);

  // Pagination
  const totalCount = completedPosts.length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedPosts = completedPosts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Group by completion date (approximating with updated_at)
  const postsByDate: Record<string, ContentPostWithDetails[]> = {};
  paginatedPosts.forEach((post) => {
    const dateKey = format(new Date(post.updated_at), "yyyy-MM-dd");
    if (!postsByDate[dateKey]) {
      postsByDate[dateKey] = [];
    }
    postsByDate[dateKey].push(post);
  });

  const sortedDates = Object.keys(postsByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Handlers
  function handlePostClick(post: ContentPostWithDetails) {
    setSelectedPostId(post.id);
    setModalOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setGoalFilter("");
    setAccountFilter("");
    setPage(1);
  }

  const hasActiveFilters = search || goalFilter || accountFilter;

  return (
    <>
      <PageHeader
        title="Content Logbook"
        description={`${totalCount} completed posts`}
      >
        <Link href={`/plans/${planId}/content`}>
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Planner
          </Button>
        </Link>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-bg-1" : ""}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </PageHeader>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <Input
                    type="text"
                    placeholder="Search posts..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Goal Filter */}
              <div className="space-y-2">
                <Label>Goal</Label>
                <Select
                  value={goalFilter || "all"}
                  onValueChange={(v) => {
                    setGoalFilter(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Goals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Goals</SelectItem>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Filter */}
              <div className="space-y-2">
                <Label>Account</Label>
                <Select
                  value={accountFilter || "all"}
                  onValueChange={(v) => {
                    setAccountFilter(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <PlatformIcon
                            platformName={account.platform?.name || "blog"}
                            size="sm"
                          />
                          {account.account_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Empty placeholder for alignment */}
              <div />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
          </CardContent>
        </Card>
      ) : completedPosts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No completed posts"
          description={
            hasActiveFilters
              ? "No posts match your current filters."
              : "Complete some posts by marking all distributions as posted."
          }
          action={{
            label: "Go to Planner",
            href: `/plans/${planId}/content`,
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-status-success" />
                    <span className="text-body font-medium">
                      {totalCount} posts completed
                    </span>
                  </div>
                  {sortedDates.length > 0 && (
                    <div className="flex items-center gap-2 text-text-muted">
                      <Calendar className="w-4 h-4" />
                      <span className="text-body-sm">
                        From{" "}
                        {format(
                          new Date(sortedDates[sortedDates.length - 1]),
                          "MMM d"
                        )}{" "}
                        to {format(new Date(sortedDates[0]), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posts Grouped by Date */}
          {sortedDates.map((dateKey) => (
            <Card key={dateKey}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <CardTitle className="text-h5">
                    {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                  <Badge variant="secondary">{postsByDate[dateKey].length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border-soft">
                  {postsByDate[dateKey].map((post) => (
                    <LogbookPostCard
                      key={post.id}
                      post={post}
                      onClick={() => handlePostClick(post)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <p className="text-body-sm text-text-muted">
                    Showing {(page - 1) * ITEMS_PER_PAGE + 1}-
                    {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}{" "}
                    posts
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-body-sm text-text-muted px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        planId={planId}
        postId={selectedPostId}
        goals={goals}
        accounts={accounts}
        initialStatus="complete"
      />
    </>
  );
}
