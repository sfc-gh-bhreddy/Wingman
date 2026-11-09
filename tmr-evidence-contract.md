# Proposed TMR leaderboard serving contract

Status: monthly-only table UI authorized for Snowhouse publication, with three unranked placeholder rows until evidence is available. Max must review and populate these proposed columns. No upstream objects or permissions were modified. The UI ignores Overview quarter controls; historical-quarter helper tests remain for period-boundary regression coverage.

Expose through `ACCOUNT_ENGINEERING.PIPELINE.DT_AGG_WINGMATE` after enriching its upstream `ACCOUNT_ENGINEERING.PIPELINE.CA_WINGMATE_DEALS` load. The app still queries only the aggregate.

Prior local code references `SALES.SALES_ENGINEERING.FIELD_SPECIALIST_REQUESTS_DX_ELEMENTUM`, `ACCOUNT_ID`, `REQUEST_CREATED_DATE`, and `SPECIALIST_TYPE`. This is not a new validation of source completeness or production access. Derive evidence independently of the final aggregate to avoid circular dependencies.

| Proposed column | Contract |
| --- | --- |
| ASE_TMR_CREATED_DATES | ARRAY of distinct YYYY-MM-DD creation dates per ACCOUNT_ID for specialist types Account Engineer and Activation SE - AMS Acq ONLY. Preserve every relevant date, not just the first. |
| ASE_TMR_HISTORY_FROM | YYYY-MM-DD string, inclusive first day of complete history supplied. |
| ASE_TMR_HISTORY_THROUGH | YYYY-MM-DD string, inclusive latest calendar day represented, which may be the current partial day. |
| ASE_TMR_HISTORY_COMPLETE | BOOLEAN true only when all qualifying events in the declared range are represented, including accounts with no events. |
| ASE_TMR_HISTORY_CHECKED_AT | UTC timestamp with offset (or SDK Date), successful evidence extraction time, not the roster refresh time. |

Populate identical evidence for every opportunity row of the same account. An empty dates array with complete=true is a known zero in the covered range; NULL/missing fields or complete=false mean unavailable, not zero. Do not mark incomplete/deleted-source history complete without reviewing the source semantics. Preserve dates after request closure, reassignment, or account rolloff; these must not erase previously credited creation events.

If creation values are timestamps with known timezone, normalize to America/New_York calendar dates upstream. If already date-grain, preserve the source calendar date; do not invent midnight ET timestamps. Document which source semantics apply before enabling live counts.

The leaderboard requires complete evidence for every mapped account in the selected region and entire requested elapsed period; partial coverage suppresses the ranking rather than unfairly favoring districts with more available evidence. Local freshness budget is 24 hours, explicitly shown when stale. Current-day numbers are as of the oldest evidence check, not a completed-day total.

Attribution: deduplicate accounts over the whole serving roster first; choose current district/region from latest CLOSE_DATE, then OPPORTUNITY_ID ascending, FQ_NUM ascending, district/region lexical tie-breakers. CLOSE_DATE selects only deterministic ownership, never TMR event eligibility. Apply region filtering afterward. Missing district/account mappings are excluded and disclosed. This is current ownership, not event-time attribution.

Metric: unique accounts with at least one new qualifying TMR in selected period. Same account may count in multiple months, but only once across a quarter or FY. No assigned-stage requirement and no #activation requirement. Targets: 12/month, 36/full quarter including current QTD; FY-to-date uses 12 times fiscal months started (max 12). FY27 is February 1, 2026 through January 31, 2027. Months outside this fiscal-year roster scope and future quarters do not receive rankings.

The separate Attachment Goals metric remains unchanged: supported first #activation observations. These are different signals and must not share a label or silently substitute for each other.

To enable: validate upstream fields/coverage, run mapper/ranking tests on real evidence, then deploy explicitly. If date coverage or extraction freshness is missing, the existing Overview still works and the leaderboard shows Awaiting TMR dates. No extra live query or persisted account snapshot is added.
