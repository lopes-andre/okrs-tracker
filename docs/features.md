# Features Guide

Complete guide to OKRs Tracker features for end users.

## Getting Started

### Creating Your First Plan

1. Log in to OKRs Tracker
2. Click **Create Plan** on the plans page
3. Enter a plan name (e.g., "2026 Goals") and year
4. Click **Create**

You're now the owner of this plan and can start adding objectives.

### Understanding the OKR Hierarchy

```
Plan (e.g., "2026 Goals")
├── Objective (e.g., "O1: Grow audience")
│   ├── Key Result (e.g., "Reach 10K followers")
│   │   ├── Q1 Target: 2,500
│   │   ├── Q2 Target: 5,000
│   │   ├── Q3 Target: 7,500
│   │   └── Q4 Target: 10,000
│   │
│   └── Key Result (e.g., "Publish 50 posts")
│       └── Q1-Q4 Targets...
│
└── Objective (e.g., "O2: Launch product")
    └── Key Results...
```

---

## Dashboard

The Dashboard provides a customizable overview of your plan's status.

### Default Widgets

| Widget | Description |
|--------|-------------|
| Summary Cards | Quick stats: objectives, KRs, progress |
| Objective Scorecards | Progress overview for each objective |
| At-Risk KRs | Key results that need attention |
| Tasks Due | Upcoming and overdue tasks |
| Recent Check-ins | Latest progress updates |
| Activity Heatmap | GitHub-style activity visualization |

### Customizing Your Dashboard

1. Click the **Edit** button (pencil icon)
2. Remove widgets by clicking the X
3. Click **Add Widget** to add new ones
4. Click **Done** to save

### Fullscreen Mode

Click the expand icon on any widget to view it in fullscreen with more detail.

---

## Objectives

Objectives are your high-level annual goals.

### Creating an Objective

1. Navigate to **OKRs** page
2. Click **New Objective**
3. Fill in:
   - **Code**: Short identifier (e.g., "O1")
   - **Name**: Descriptive title
   - **Description**: Optional details
4. Click **Create**

### Objective Progress

Progress is automatically calculated from the Key Results:
- Each KR contributes equally to the objective
- Progress shows as a percentage (0-100%)

---

## Key Results

Key Results are measurable outcomes that indicate objective achievement.

### KR Types

| Type | Use Case | Example |
|------|----------|---------|
| **Metric** | Numeric goal | "Increase revenue to $100K" |
| **Count** | Quantity goal | "Complete 10 blog posts" |
| **Milestone** | Binary achievement | "Launch product v2.0" |
| **Rate** | Percentage goal | "Achieve 95% uptime" |
| **Average** | Sustained metric | "Maintain 4.5 star rating" |

### Creating a Key Result

1. Open an objective
2. Click **Add Key Result**
3. Fill in:
   - **Name**: What you want to achieve
   - **Type**: Select from the options above
   - **Start Value**: Where you're starting
   - **Target Value**: Where you want to be
   - **Unit**: Measurement unit (%, followers, $, etc.)
   - **Direction**: Increase, decrease, or maintain
4. Click **Create**

### Progress Direction

- **Increase**: Progress grows as value increases (e.g., revenue)
- **Decrease**: Progress grows as value decreases (e.g., bugs)
- **Maintain**: Progress based on staying within range

### Setting Quarterly Targets

1. Click the **Quarters** button on a KR
2. Set targets for Q1, Q2, Q3, Q4
3. Click **Save**

Quarterly targets help you pace your progress throughout the year.

---

## Check-ins

Check-ins record your progress toward Key Results.

### Recording a Check-in

1. Click **Check In** on a Key Result
2. Enter:
   - **New Value**: Current progress
   - **Note**: What happened this period
   - **Evidence URL**: Optional link to proof
3. Click **Save**

The KR's current value updates automatically.

### Check-in Best Practices

- Check in regularly (weekly recommended)
- Add notes explaining changes
- Link to evidence when possible
- Be honest about setbacks

---

## Tasks

Tasks are actionable items that contribute to your OKRs.

### Task Properties

| Property | Options | Description |
|----------|---------|-------------|
| Status | Pending, In Progress, Completed, Cancelled | Current state |
| Priority | Low, Medium, High | Importance level |
| Effort | Light, Moderate, Heavy | Time/energy estimate |
| Due Date | Any date | When it's due |
| Due Time | Optional | Specific time |

### Creating a Task

1. Navigate to **Tasks** page
2. Click **New Task**
3. Fill in:
   - **Title**: What needs to be done
   - **Description**: Optional details
   - **Link to**: Connect to an Objective or KR
   - **Priority**: How important
   - **Effort**: How much work
   - **Due Date**: When it's due
4. Click **Create**

### Task Views

| View | Shows |
|------|-------|
| Active | All non-completed tasks |
| Today | Tasks due today |
| This Week | Tasks due this week |
| Overdue | Past-due tasks |
| Completed | Finished tasks |
| All | Everything |

### Using Tags

Tags help organize tasks across different dimensions:

1. Create tags in **Settings → Tags**
2. Apply tags when creating/editing tasks
3. Filter tasks by tag

Tag kinds:
- **Category**: Topic areas (Marketing, Engineering)
- **Platform**: Where (Web, Mobile, API)
- **Initiative**: Projects or themes
- **Custom**: Anything else

### Recurring Tasks

Set tasks to repeat automatically:

1. Edit a task
2. Enable **Recurrence**
3. Choose frequency:
   - Daily
   - Weekly (select days)
   - Monthly (select day of month)
   - Yearly
4. Set when to stop:
   - Never
   - After X occurrences
   - On a specific date

---

## Analytics

The Analytics page provides insights into your progress.

### Available Tabs

#### Overview
- Summary cards with key metrics
- Progress chart showing trends
- Activity bar chart

#### Progress
- Burn-up chart (progress over time)
- Pace analysis (ahead/behind schedule)
- Quarterly comparison

#### Performance
- KR performance table
- Objective breakdown
- Productivity metrics

#### Activity
- Activity heatmap (contribution calendar)
- Recent activity timeline
- Activity by type

#### Tasks
- Task completion trends
- Priority distribution
- Effort analysis

#### Reviews
- Weekly review completion rate
- Review streak
- Historical ratings

---

## Weekly Reviews

Structured weekly reflection to maintain momentum.

### Starting a Review

1. Navigate to **Reviews** page
2. Click **Start Review** (or continue existing)
3. Follow the guided steps

### Review Steps

1. **Overview**: See week's stats
2. **Check-ins**: Review KR progress
3. **Tasks**: Update task status
4. **What Went Well**: Celebrate wins
5. **What to Improve**: Identify issues
6. **Lessons Learned**: Capture insights
7. **Notes**: Additional thoughts
8. **Rating**: Rate your week (1-5 stars)

### Review Settings

Customize in **Settings → Reviews**:
- Reminder day (default: Friday)
- Reminder time
- Auto-create reviews

---

## Timeline

Activity feed showing all changes to your plan.

### Filtering Events

Filter by:
- **Entity Type**: Tasks, Check-ins, Objectives, KRs
- **Event Type**: Created, Updated, Deleted, Completed
- **User**: Team member who made change
- **Date Range**: Custom time period

### Event Types

| Event | Description |
|-------|-------------|
| Created | New item added |
| Updated | Item modified |
| Deleted | Item removed |
| Completed | Task or review finished |
| Status Changed | Task status update |

---

## Settings

Plan configuration options.

### Plan Settings

- **Name**: Change plan name
- **Year**: Plan year
- **Description**: Plan details

### Tags Management

Create and manage tags for task organization:
- Create new tags
- Edit tag names and colors
- Delete unused tags
- View tag usage counts

### Review Settings

Configure weekly review preferences:
- Reminder scheduling
- Auto-creation settings

### Data Management

#### Export

Download your plan data:
- **JSON**: Complete backup (can be imported later)
- **Markdown**: Human-readable format

#### Import

Restore from a previous export:
1. Click **Import Plan**
2. Select JSON file
3. Preview what will be imported
4. Configure options:
   - Skip check-in history
   - Skip weekly reviews
   - Reset progress values
5. Click **Import**

#### Cloud Backups

Store backups in the cloud:
1. Click **Create Backup**
2. Backups appear in the list
3. Restore or delete as needed

---

## Collaboration

Work with others on shared plans.

### Roles

| Role | Can View | Can Edit | Can Admin |
|------|----------|----------|-----------|
| Viewer | Yes | No | No |
| Editor | Yes | Yes | No |
| Owner | Yes | Yes | Yes |

### Inviting Members

1. Go to **Settings → Members**
2. Click **Invite Member**
3. Enter their email
4. Select their role
5. Click **Send Invite**

### Comments

Add comments to any item:
1. Click the comment icon
2. Type your comment
3. Use **@username** to mention someone
4. Click **Post**

### Notifications

Receive alerts when:
- Someone mentions you
- You're assigned a task
- Someone comments on your items

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Show help |
| `n` | New item (context-dependent) |
| `e` | Edit selected |
| `/` | Focus search |
| `Esc` | Close dialog |

---

## Content Planner

The Content Planner helps you manage content across multiple social media platforms.

> For detailed documentation, see [Content Planner Documentation](./content-planner.md)

### Quick Overview

| Feature | Description |
|---------|-------------|
| **Kanban Board** | Visual workflow (Backlog → Tagged → Ongoing → Complete) |
| **Multi-Platform** | 8 platforms (Instagram, LinkedIn, YouTube, etc.) |
| **Distributions** | Schedule content to multiple accounts |
| **Calendar** | Month, week, day, and list views |
| **Campaigns** | Track paid advertising |
| **Analytics** | Performance metrics |

### Content Workflow

1. Create posts in **Backlog**
2. Add distributions → moves to **Tagged**
3. Schedule distributions → moves to **Ongoing**
4. All posted → moves to **Complete**

### Key Features

- **Drag and drop** reordering within columns
- **Multi-select** for bulk operations
- **Debounced search** (300ms delay)
- **Load more** pattern for large lists
- **Content Logbook** for completed posts archive
- **Video links** with thumbnails
- **Account-KR linking** for goal tracking

---

## Tips for Success

### Setting Good OKRs

1. **Objectives should be ambitious** - Stretch goals inspire
2. **Key Results should be measurable** - "Increase X by Y%"
3. **Aim for 70% achievement** - 100% means too easy
4. **Limit to 3-5 objectives** - Focus is key
5. **Limit to 3-5 KRs per objective** - Keep it manageable

### Maintaining Momentum

1. **Check in weekly** - Regular updates keep you honest
2. **Do weekly reviews** - Reflection improves execution
3. **Break down large goals** - Use quarterly targets
4. **Link tasks to KRs** - Connect daily work to big goals
5. **Celebrate progress** - Acknowledge achievements

### Using Tags Effectively

1. **Keep it simple** - Too many tags cause confusion
2. **Be consistent** - Use the same tags across tasks
3. **Review periodically** - Remove unused tags
4. **Use for filtering** - Tags help find related work

---

## FAQ

### How is progress calculated?

For each KR:
```
Progress = (Current - Start) / (Target - Start)
```

For decrease direction:
```
Progress = (Start - Current) / (Start - Target)
```

Objective progress = average of its KR progress values.

### What do the pace indicators mean?

| Status | Meaning |
|--------|---------|
| **Ahead** | Progress exceeds time elapsed (doing great!) |
| **On Track** | Progress matches time elapsed |
| **At Risk** | Slightly behind schedule |
| **Off Track** | Significantly behind schedule |

### Can I change a KR's target mid-year?

Yes, but consider:
- It affects historical pace calculations
- Document the reason in the description
- Your check-in history remains intact

### How do I delete a plan?

Only plan owners can delete:
1. Go to **Settings**
2. Scroll to **Danger Zone**
3. Click **Delete Plan**
4. Confirm the action

**Warning**: This cannot be undone. Export first!

### Can I recover deleted items?

No, deletions are permanent. Use exports/backups for safety.
