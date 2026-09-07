-- BI_SECURITY schema: owned by the DEs, written only by the portal's Admin tab (maker-checker). Reference DDL.
CREATE TABLE bi_security.entitlements (
  user_id      VARCHAR2(64)  NOT NULL,   -- SSO user id
  dimension    VARCHAR2(64)  NOT NULL,   -- e.g. branch_code (must exist in rls-policies.yaml → dimensions)
  value        VARCHAR2(64)  NOT NULL,   -- e.g. DXB01 (must exist in the dimension's values_from)
  granted_by   VARCHAR2(64)  NOT NULL,
  approved_by  VARCHAR2(64)  NOT NULL,   -- ≠ granted_by (maker-checker)
  granted_at   TIMESTAMP     NOT NULL,
  expires_at   TIMESTAMP,
  status       CHAR(1)       DEFAULT 'A' NOT NULL,   -- A active, R revoked
  CONSTRAINT pk_entitlements PRIMARY KEY (user_id, dimension, value)
);
CREATE TABLE bi_security.entitlement_audit (
  audit_id     NUMBER GENERATED ALWAYS AS IDENTITY,
  user_id      VARCHAR2(64), dimension VARCHAR2(64), value VARCHAR2(64),
  action       VARCHAR2(8),                 -- GRANT, REVOKE
  actor        VARCHAR2(64), approver VARCHAR2(64), at_ts TIMESTAMP
);
CREATE TABLE bi_security.query_log (
  at_ts TIMESTAMP, user_id VARCHAR2(64), kpi VARCHAR2(64), view_name VARCHAR2(64),
  rls_rule VARCHAR2(16), rls_values NUMBER, duration_ms NUMBER
);

-- Sample rows (what the Admin tab writes)
INSERT INTO bi_security.entitlements VALUES ('a.almarri', 'branch_code', 'DXB01', 'r.hassan', 's.khan', TIMESTAMP '2026-09-01 09:00:00', NULL, 'A');
INSERT INTO bi_security.entitlements VALUES ('m.saeed',   'branch_code', 'DXB07', 'r.hassan', 's.khan', TIMESTAMP '2026-09-01 09:00:00', NULL, 'A');
INSERT INTO bi_security.entitlements VALUES ('m.saeed',   'branch_code', 'DXB09', 'r.hassan', 's.khan', TIMESTAMP '2026-09-01 09:00:00', NULL, 'A');
