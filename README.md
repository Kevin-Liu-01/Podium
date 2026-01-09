# PODIUM: Advanced Hackathon Judging Management System

PODIUM is a high-performance judging coordinator built for large-scale hackathons (like HackPrinceton). It solves the complex logistics of assigning dozens of judges to hundreds of projects across multiple floors, ensuring fair distribution, physical efficiency, and judging variety.

## Core Philosophy: The Priority Framework

The system is built on a "Constraint Satisfaction" model. Every automated assignment must navigate a hierarchy of needs to ensure the integrity of the event.

1. Necessities (Hard Constraints)

Judge Integrity: A judge is never assigned a team they have already scored.

Zero Idle Time: No judge should ever be left waiting for an assignment if there are valid teams remaining on their floor.

Physical Validity: Judges are only assigned to teams located within their specific floor/sector.

2. Strong Wants (Optimization Targets)

Even Distribution (Pressure): The system prioritizes assigning teams with the fewest completed scores to ensure all projects reach the required review threshold simultaneously.

Anti-Clustering: Minimize the number of judges scoring the same team at the exact same time.

Judging Variety (Hammad's Rule): Prevent "Fuzzy Duplicates." The system ensures that a specific group of teams is not compared against each other repeatedly across different judges.

3. Weak Wants (Convenience)

Physical Proximity: When all other factors are equal, the system selects teams that are located close to each other (based on sequential team numbers) to minimize judge travel time.

The Algorithm: Multi-Pass Relaxation & Randomized Spread

The "Auto Generator" uses a sophisticated scoring and filtering engine to find the optimal 5-team block for a judge.

### Phase 1: Historical Memory & Fuzzy Matching

Before scanning, the engine builds a signature map of all existing assignments (submitted and active).

The Rule: If a potential 5-team block shares 4 or more teams with any existing block, it is considered "Too Similar" and is discarded in the first pass.

### Phase 2: Shuffled Window Search

To prevent the "Top-Heavy" bug (where projects 1-100 get all the judges while 101-200 wait), the algorithm does not scan teams linearly.

It calculates all possible 5-team indices.

It shuffles these indices using a Fisher-Yates algorithm.

This forces judges to "probe" different sections of the floor randomly, ensuring a natural spread across the venue.

Phase 3: The Scoring Function

For every valid window, a cost is calculated:

$$Cost = (\text{PressureScore} \times 1000) + \text{ClosenessPenalty}$$

PressureScore: The total number of existing reviews in that block.

ClosenessPenalty: The range between the highest and lowest team number.

Multiplying Pressure by 1000 ensures that even distribution is always the primary driver, while proximity acts as a tie-breaker.

Phase 4: Constraint Relaxation

If a judge has teams left to see but Pass 1 (Strict) fails to find a "dissimilar" block, the algorithm immediately triggers Pass 2 (Relaxed). Pass 2 ignores Hammad’s Rule to ensure the judge receives an assignment, upholding the "Zero Idle Time" necessity.

## Visual Intelligence Tools

1. The Team Status Matrix

A high-density visualizer that represents every project as a dynamic "Team Dot":

Color Gradient: Transitions from Dark Orange (0-1 reviews) to Bright Orange (3+ reviews), providing an instant heatmap of judging progress.

Active Pulse: A cyan center dot indicates that a team is currently being judged by someone.

Global & Local Views: Available as a floor-wide heatmap or a judge-specific view to see exactly what an individual has covered.

2. Judge Status Dashboard

Real-time tracking of the judging workforce:

Busy: Currently on the floor with active team IDs.

Assignable: Finished current task, awaiting next block.

Finished: Proactively calculated. If a judge has fewer than 5 teams left to see on their floor, they are flagged as "Finished" to prevent logistical errors.

## Data Management & Importing

### Bulk Team Setup

The system supports three entry modes:

Manual: Add single teams with auto-extending floor ranges.

Bulk Generate: Creates sequential teams (e.g., "Team 1" to "Team 200").

Smart Import: Accepts raw text strings (e.g., 101, Project Name).

Overwrite/Merge Mode: An advanced feature allowing coordinators to update existing team names or move them between floors without deleting their existing scores or history.

### Floor Management

Coordinators define floor ranges (e.g., Floor 1: Teams 1-100). The system automatically validates every assignment against these ranges to ensure judges stay in their assigned physical sectors.

## Tech Stack

Frontend: React with Next.js (App Router).

Styling: Tailwind CSS with a custom "Sophisticated Dark" palette.

Animations: Framer Motion for layout transitions and modal states.

Database: Firebase Firestore (Real-time listeners ensure all dashboards sync across multiple coordinator devices instantly).

State Management: React Context API with custom hooks for complex exports.

## Usage for Coordinators

Setup Floors: Define your physical ranges in the Admin tab.

Import Teams: Paste your project list. Use "Overwrite Mode" if the schedule changes mid-event.

Assign Judges: - Use the Auto Generator for 90% of assignments to ensure mathematical fairness.

Use Manual Mode for specific edge cases or "VIP" judging tracks.

Monitor Matrix: Keep the Team Status Matrix open on a large screen to identify "cold spots" (dark dots) that need more judge attention.

# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
