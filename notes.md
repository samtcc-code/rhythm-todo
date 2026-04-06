# Mobile Redesign Analysis

## Current State
The mobile TodayView already has a dedicated MobileTodayView component with:
- Home screen: shows today's tasks as tappable cards (tap to complete), Brain Dump and Sift buttons
- Brain Dump screen: full-screen capture with big input, Urgent/Important/Today toggles per item
- Evening Sift screen: tap tasks to select, push to tomorrow

## What the User Wants
- Mobile should ONLY be for Brain Dump and Sift — no rearranging, no detailed task editing
- Optimize for fat fingers — everything oversized
- The user said "nothing looks bigger" despite my previous changes

## Root Cause of "Nothing Looks Bigger"
The mobile view IS using the MobileTodayView which has bigger elements. But the DashboardLayout wraps everything including mobile, and the sidebar header/nav is still the standard size. Also, on mobile, the user might be navigating to other views (Matrix, Someday, etc.) which don't have mobile-optimized versions.

## Plan
1. On mobile, skip the DashboardLayout entirely — no sidebar, no header bar
2. Show ONLY the TodayView mobile experience (Brain Dump home / Brain Dump / Sift)
3. Make everything even bigger — 20px+ text, 56px+ buttons, 48px+ inputs
4. Add a minimal top bar with just the app name and dark mode toggle
5. Other routes (Matrix, Someday, etc.) should redirect to Today on mobile
