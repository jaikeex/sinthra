# Sinthra

Sinthra is a self-hosted observability platform that collects telemetry from deployed applications and lets people explore, chart, and alert on it.

## Scoping

**Project**:
The top-level boundary for telemetry and access. Data never crosses Projects, and every piece of telemetry belongs to exactly one.
_Avoid_: Tenant, workspace, organization, app

**Service**:
One running application that emits telemetry, identified by its OpenTelemetry `service.name`. Each Service belongs to exactly one Project.
_Avoid_: App, component, microservice

**Environment**:
A label distinguishing deployments of the same Services within one Project, such as prod or staging.
_Avoid_: Stage, deployment, Project (when meaning prod vs staging)

**Ingest key**:
A named, individually revocable secret that grants permission only to send telemetry into one Project. A Project can have several.
_Avoid_: API key, token, DSN

**Public Project**:
A Project that anyone can view read-only without logging in.
_Avoid_: Demo mode, shared project

## Access

**User**:
An account that can log in to Sinthra.
_Avoid_: Account, member, customer

**Membership**:
A User's role within one Project: either Owner or Viewer. A User sees only the Projects they hold a Membership in, plus Public Projects.
_Avoid_: Permission, grant, access

**Owner**:
A Membership role with full control over a Project, including its Ingest keys and settings.
_Avoid_: Admin (that is a different role), maintainer

**Viewer**:
A Membership role with read-only access to a Project's telemetry and dashboards.
_Avoid_: Guest, reader

**Admin**:
A User who manages the Sinthra instance itself, independent of any Project.
_Avoid_: Superuser, root, Owner

## Metrics

**Service metrics**:
Request rate, error rate and latency of a Service, derived by Sinthra from its spans. They exist for every Service without any setup.
_Avoid_: RED metrics, golden signals, derived metrics

**App metrics**:
Metrics an application sends to Sinthra itself, such as CPU usage or custom counters, stored and shown as received.
_Avoid_: Custom metrics, Service metrics

## Reading telemetry

**Query**:
A structured description of which telemetry to read from one Project and how to filter, aggregate, group and bucket it over time. Dashboards, Alert rules and filtered views are all built from Queries.
_Avoid_: Search, filter, raw SQL

**Dashboard**:
A named arrangement of Panels belonging to exactly one Project.
_Avoid_: Board, view, page

**Panel**:
One Query on a Dashboard, together with how its result is displayed.
_Avoid_: Widget, chart, tile

**Live tail**:
A view that shows new telemetry as soon as it is stored.
_Avoid_: Stream, real-time feed

## Detection

**Alert rule**:
A condition, defined by an Owner, that Sinthra continuously evaluates against a Project's telemetry.
_Avoid_: Monitor, check, trigger

**Anomaly**:
A deviation Sinthra detects by itself, when a Service's behaviour moves well away from its own learned normal.
_Avoid_: Outlier, incident, alert

**Alert**:
A notification-worthy event raised by either an Alert rule or an Anomaly.
_Avoid_: Notification, incident, alarm
