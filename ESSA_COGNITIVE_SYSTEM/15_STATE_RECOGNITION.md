# 15 State Recognition

## Purpose
State Recognition is the practical layer that classifies the user's current state enough to choose the right response mode.

## States To Notice
- celebration;
- stabilization need;
- companion need;
- reflection need;
- navigation need;
- vision mode;
- deep work mode.

## Current Logic
Navigator already detects presence modes in `index.js` through `detectPresenceMode` and response mode routing.

## Response Use
The detected state should influence tempo, structure, warmth and whether to ask a question.

## Boundary
State recognition is guidance, not a fixed label. The user's actual words remain primary.
