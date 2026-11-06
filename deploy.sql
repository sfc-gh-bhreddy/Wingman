-- =============================================================================
-- Wingman — SPCS Deployment
-- =============================================================================
-- Run these statements in order.
--
-- Everything lives in ACCOUNT_ENGINEERING.WINGMAN, owned by
-- ACCOUNT_ENGINEERING_ADMIN_RL. Moved here 2026-11-06 off TEMP.BHREDDY, which
-- is a shared Snowhouse database that could be wiped.
--
-- The service runs in ACTIVATION_POOL. Only ACCOUNT_ENGINEERING_ADMIN_RL has
-- USAGE on that pool (and the grant carries no grant option), so the service
-- must be created and owned by that role — not SALES_ENGINEER.
-- =============================================================================

-- 1. Role and schema
USE ROLE ACCOUNT_ENGINEERING_ADMIN_RL;
USE SCHEMA ACCOUNT_ENGINEERING.WINGMAN;

-- 2. Image repository
CREATE IMAGE REPOSITORY IF NOT EXISTS ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_IMAGES;

-- Show the repo URL (you'll need this for docker push)
SHOW IMAGE REPOSITORIES LIKE 'WINGMAN_IMAGES' IN SCHEMA ACCOUNT_ENGINEERING.WINGMAN;
-- The "repository_url" value looks like:
--   <org>-<acct>.registry.snowflakecomputing.com/account_engineering/wingman/wingman_images

-- 3. Confirm the compute pool is available
SHOW COMPUTE POOLS LIKE 'ACTIVATION_POOL';

-- =============================================================================
-- DOCKER BUILD & PUSH (run these in your terminal, not in Snowflake)
-- =============================================================================
--
-- # Log in to the Snowflake image registry (SSO accounts: use snow, not docker login)
-- snow spcs image-registry login --connection "sfcogsops-snowhouse_aws_us_west_2"
--
-- # Build the image (always --platform linux/amd64)
-- cd ~/Desktop/wingmate_agg_test
-- docker build --platform linux/amd64 -t wingman:<tag> .
--
-- # Tag for Snowflake registry
-- docker tag wingman:<tag> <repository_url>/wingman:<tag>
--
-- # Push
-- docker push <repository_url>/wingman:<tag>
--
-- Use a unique, dated tag per release (e.g. consolidated-20261106) rather than
-- :latest, so ALTER SERVICE actually picks up the new image.
-- =============================================================================

-- 4. Create the service (first time only — see step 8 for updates)
CREATE SERVICE IF NOT EXISTS ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_SERVICE
  IN COMPUTE POOL ACTIVATION_POOL
  FROM SPECIFICATION $$
  spec:
    containers:
      - name: app
        image: /account_engineering/wingman/wingman_images/wingman:consolidated-20261106
        env:
          SNOWFLAKE_WAREHOUSE: SNOWADHOC
        resources:
          requests:
            cpu: "1"
            memory: 2G
          limits:
            cpu: "2"
            memory: 4G
    endpoints:
      - name: app
        port: 3000
        public: true
  $$
  QUERY_WAREHOUSE = SNOWADHOC
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

-- 5. Let viewers reach the endpoint
GRANT SERVICE ROLE ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_SERVICE!ALL_ENDPOINTS_USAGE
  TO ROLE SALES_ENGINEER;

-- 6. Check service status
SELECT SYSTEM$GET_SERVICE_STATUS('ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_SERVICE');

-- 7. Get the public URL
SHOW ENDPOINTS IN SERVICE ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_SERVICE;
-- The "ingress_url" is the URL you hand out to users.
--
-- IMPORTANT: the hostname belongs to the service object, and neither the
-- compute pool nor the database can be changed by ALTER SERVICE. Dropping and
-- recreating the service — including to move pools or databases — always
-- produces a NEW URL that cannot be pinned or reused. Always update with
-- ALTER SERVICE (step 8) to keep the link stable.

-- 8. Update to a new image (preserves the URL — this is the normal release path)
-- ALTER SERVICE ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_SERVICE
--   FROM SPECIFICATION $$
--   ... same spec, new image tag ...
--   $$;

-- 9. View logs (debugging)
-- SELECT SYSTEM$GET_SERVICE_LOGS('ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_SERVICE', 0, 'app', 100);

-- =============================================================================
-- TEARDOWN (when needed)
-- =============================================================================
-- DROP SERVICE IF EXISTS ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_SERVICE;
-- DROP IMAGE REPOSITORY IF EXISTS ACCOUNT_ENGINEERING.WINGMAN.WINGMAN_IMAGES;
