# Security Policy

This policy applies to every public FINOLABS repository that does not publish its own `SECURITY.md`.

## Report a vulnerability

Use GitHub's **Report a vulnerability** flow on the affected repository (Security tab, then Advisories) to open a private security advisory. Include the affected version, operating system, reproduction steps, impact, and a minimal proof of concept. Do not open a public issue for an unpatched vulnerability, and do not include real credentials or user data.

If the repository does not offer that flow, write to [finos@finolabs.io](mailto:finos@finolabs.io) with the same details and the repository name. Do not put sensitive details in the subject line.

Maintainers acknowledge a valid report through the private channel, investigate it, and coordinate disclosure after a fix is available.

## Scope

Security issues in a FINOLABS repository's code, instructions, packaging, or workflows belong here. Problems in a third-party service or host that a plugin depends on belong with that provider.

A repository that publishes its own `SECURITY.md` follows that file instead, including its list of supported versions.
