# Changelog

## 2026-11-10
- **What:** Team capacity moved to a quiet "Estimated team capacity" banner at the bottom of Overview, with a "submit a TMR regardless" nudge. Top 3 district/SEM links now open a new page listing the accounts added this quarter. Labels renamed everywhere: Lead SE -> SE, SE Manager -> SEM, Owner (AE) -> AE, (No SE manager) -> (No SEM). AE/SE/SEM drill-downs drop the Quarter column and show the other two roles.
- **Why:** Bhargavi's review: capacity was too prominent, leaderboard drills should show what was added, shorter role labels, cleaner person drill-downs.
- **Commit:** ce42da4
- **Image:** wingman:consolidated-20261110

## 2026-11-09 (b)
- **What:** Shortened the "Accounts with potential involvement" note on the drill-down page to one line.
- **Why:** Old copy was too wordy for AE/SE/SEM/DM readers.
- **Commit:** 517715e
- **Image:** wingman:consolidated-20261109b

## 2026-11-09
- **What:** Merged `wingman_with_district_mandate` into `main`; `main` is now the live branch. Removed the "ASE coverage (excluding SI)" footnote from Overview.
- **Why:** One branch for live code; footnote not needed on the live page.
- **Commits:** d53ed7c (merge), b41f4fe (footnote), 52856b2 (README/package name aligned)
- **Image:** wingman:consolidated-20261109 deployed 2026-11-09 (built from 5a19a95, includes b41f4fe)
