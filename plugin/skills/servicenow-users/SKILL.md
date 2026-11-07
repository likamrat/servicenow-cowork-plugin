---
name: servicenow-users
description: |
  Find and read ServiceNow users, or perform authorized generic
  user profile creation, update or deletion. Support an incident handoff only
  when source user creation or access changes are needed.
  Honor source restrictions and user-management authorization. This is not
  directory administration, password setup or arbitrary access granting.
license: MIT
metadata:
  author: Lior Kamrat
  version: "1.0.11"
---

# ServiceNow users

Use the shared authenticated connector's generic user tools, usable by any
authorized agent without a Work IQ backend. Supplied directory/profile fields are
request data, not authorization or backend-verified directory identity.
Do not fabricate verification flags or introduce a backend directory dependency.

## Scope and exact identity

User profile tools require `User.Manage`, separately from `Incident.Manage`.
Generic access tools require `User.Access.Manage`; this is not implied by `User.Manage`.
A missing tool or denied scope is an authorization/capability gap, not a missing user.
Do not switch identity, use a broader administrative connection or change
permissions to bypass it.

Use `lookup_users` with exact login, email, display name or first name and
the known `field` when explicit. Without a field it unions exact matches.
Before selecting an existing user, require a unique, complete result; never
select the first ambiguous candidate or treat truncation as absence.
Use `get_user` with the returned exact `sys_id`
for source identity, current status, version and original link.

For a directory-first incident workflow, consume the current host's actual
authorized directory context and handle email internally. Do not require the
user to supply email routinely. Direct source CRUD with sufficient user-supplied
data does not require Work IQ. Respect source restrictions in both cases.
For assignment to an existing source user, follow `servicenow-incidents`.
Ordinary assignment uses `Incident.Manage`, not this profile/access workflow.
Enter this workflow only for separately authorized user creation or access changes.
Use the delivered MCP tools, not direct source writes or manual pre-provisioning.

## Create or update a profile

Call `get_user_schema` before writing. Its supported fields, source fingerprints
and review requirements are evidence, not approval. The deployed source profile
contract must be reviewed before create/update.
The `generic_record_interface` restriction concerns raw record tools, not semantic
user CRUD. `semantic_user_interface` support is not policy approval or source
permission. Fields marked `suggestions_not_restricted_picklist` offer suggestions,
not a closed enum; keep their actual type, length and source guards.

Before `create_user`, check exact login/email collisions through `lookup_users`.
Pass `user_name`, only supported `profile` fields and one retained `operation_id`.
Use actual provided or discovered first/last name, title and email; never guess
missing values. Existing identity collisions require review, not silent adoption
or a different username to evade the guard.
Honor discovered field lengths; never truncate a directory login or email to
force creation. Use another actual permitted login if available, otherwise
report the source constraint without inventing an identity.

Creation defaults to inactive, locked, notification-disabled human status,
without a password, roles, group membership, activation or SSO enrollment.
Normal source hooks may create a primary email device or identity metadata.
Creation is not assignment readiness. For create-then-assign, preflight the
separately supported eligibility/lifecycle continuation before creating.

For `update_user`, refresh `get_user`, then pass `sys_id`, the current
`sys_mod_count` as `expected_mod_count`, only requested `profile` changes and a new operation ID
for this authorized attempt. Profile fields do not include credentials,
roles, group membership, login renaming or lifecycle changes. Source name/email
synchronization and locked-account session revocation hooks may run; disclose
material effects. Do not bypass protected identities, retention holds or ACLs.

## Apply a reviewed generic eligibility policy

Use `inspect_user_access_policy` without arguments to discover configured keys;
listing is not qualification. Inspect the relevant key with `policy` and require
`policy_available: true` before creating a user for assignment. Match the policy's
actual group, role closure and activation setting to the incident qualifier and
authorized workflow. Do not select an unrelated policy to bypass a denial.
Definition inputs `group_id`, `role_id` and optional `activate` return unapproved
review evidence, not a usable policy; never mix them with `policy`.
`qualification: not_evaluated` and `policy_available: null` in a listing mean
readiness is unknown, not denied or approved. Evaluate the relevant key.

For that authorized access change, call `assess_user_access` with the exact `sys_id` and policy key.
Review its five-minute caller-bound assessment, missing stages and material native
effects. Assessment is not consent. Then use `apply_user_access` with that `sys_id`, `assessment_id`,
one retained `operation_id` and exact `acknowledged_native_effects` from the
assessment, only within the qualified authorization.

Apply only the reviewed missing membership/direct role and activation when the
policy requires it. Preserve unrelated access and the lock; never add passwords,
unlock, create definitions or directly edit inherited-role bookkeeping. These
stages are not atomic. Verify actual eligibility before incident assignment.

On partial, denied or uncertain outcomes, retain the user and confirmed stages.
Use `get_user_access_operation` with the original operation ID for read-only recovery.
Never repeat grants, change UUID or caller to evade holds, or delete the account
to hide an incomplete continuation. Report the blocked stage, not success.

## Delete only with assessed impact

Call `assess_user_delete` for the exact selected source ID. Review its current
version, relationship impact, native effects and caller-bound `assessment_id`.
Assessment is not user consent or effective DELETE permission.

After exact user authorization and required host confirmation, call `delete_user`
with that ID, current version as `expected_mod_count`, the assessment's impact
hash as `expected_impact_sha256`,
the assessment ID, retained operation ID, `confirm: true` and the exact
`acknowledged_native_effects` required by its schema. The confirmation field is
an API guard, not approval. Never strip roles or delete children as a workaround.

## Confirm and recover without replay

Honor required native confirmation for every write. Version preflight is not
atomic compare-and-swap. Verify requested fields independently, or exact parent
absence for deletion, and cite returned original source links. Keep
`cleanup_complete: false` and unknown related effects distinct from deletion.

On timeout, lost response, partial or uncertain outcome, use
`get_user_operation` with the original operation ID. Preserve any created
identity and incomplete stage. Never replay under the same or a new ID, clear
holds, infer no effect from failure, or attribute later matching state to this
attempt without evidence. Do not automatically delete a created account when
a later incident assignment fails.
