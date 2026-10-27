-- =============================================================================
-- Wingman — SPCS Deployment
-- =============================================================================
-- Run these statements in order. Adjust DB/SCHEMA/POOL names to match your env.
-- Prerequisites: a role with CREATE IMAGE REPOSITORY, CREATE SERVICE, and
-- USAGE on a compute pool. SALES_ENGINEER cannot create databases or compute
-- pools, so this deploys into TEMP.BHREDDY on an existing pool.
-- =============================================================================

-- 1. Schema
USE ROLE SALES_ENGINEER;
USE SCHEMA TEMP.BHREDDY;

-- 2. Image repository
CREATE IMAGE REPOSITORY IF NOT EXISTS TEMP.BHREDDY.WINGMAN_IMAGES;

-- Show the repo URL (you'll need this for docker push)
SHOW IMAGE REPOSITORIES LIKE 'WINGMAN_IMAGES' IN SCHEMA TEMP.BHREDDY;
-- Copy the "repository_url" value — it looks like:
--   <org>-<acct>.registry.snowflakecomputing.com/temp/bhreddy/wingman_images

-- 3. Compute pool: reuse an existing one you have USAGE on
SHOW COMPUTE POOLS;

-- =============================================================================
-- DOCKER BUILD & PUSH (run these in your terminal, not in Snowflake)
-- =============================================================================
--
-- # Log in to the Snowflake image registry (SSO accounts: use snow, not docker login)
-- snow spcs image-registry login --connection "sfcogsops-snowhouse_aws_us_west_2"
--
-- # Build the image
-- cd ~/Desktop/Wingman
-- docker build --platform linux/amd64 -t wingman:latest .
--
-- # Tag for Snowflake registry
-- docker tag wingman:latest <repository_url>/wingman:latest
--
-- # Push
-- docker push <repository_url>/wingman:latest
--
-- =============================================================================

-- 4. Create the service
CREATE SERVICE IF NOT EXISTS TEMP.BHREDDY.WINGMAN_SERVICE
  IN COMPUTE POOL BEARLEY_COMPUTE_POOL
  FROM SPECIFICATION $$
  spec:
    containers:
      - name: app
        image: /temp/bhreddy/wingman_images/wingman:latest
        env:
          SNOWFLAKE_WAREHOUSE: SNOWADHOC
        resources:
          requests:
            cpu: 0.5
            memory: 512M
          limits:
            cpu: 1
            memory: 1G
    endpoints:
      - name: app
        port: 3000
        public: true
  $$
  QUERY_WAREHOUSE = SNOWADHOC
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

-- 5. Check service status
SELECT SYSTEM$GET_SERVICE_STATUS('TEMP.BHREDDY.WINGMAN_SERVICE');

-- 6. Get the public URL
SHOW ENDPOINTS IN SERVICE TEMP.BHREDDY.WINGMAN_SERVICE;
-- The "ingress_url" is the URL you hand out to users. It changes every time
-- the service is dropped and recreated.

-- 7. View logs (debugging)
-- SELECT SYSTEM$GET_SERVICE_LOGS('TEMP.BHREDDY.WINGMAN_SERVICE', 0, 'app', 100);

-- =============================================================================
-- TEARDOWN (when needed)
-- =============================================================================
-- DROP SERVICE IF EXISTS TEMP.BHREDDY.WINGMAN_SERVICE;
-- DROP IMAGE REPOSITORY IF EXISTS TEMP.BHREDDY.WINGMAN_IMAGES;
