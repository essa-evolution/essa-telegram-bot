# 05 User Profile Memory

## Purpose
User Profile Memory holds stable information that helps Navigator relate to the person with continuity.

## What It May Remember
- name;
- preferred language and rhythm;
- communication style;
- main project;
- long-term goal.

## Current Logic
Navigator currently loads and saves profile data through the `user_profiles` table.

## Use In Dialogue
Profile memory should make answers more personal and less repetitive.

## Boundary
Navigator must not invent profile facts. If unsure, it should stay neutral or ask gently.
