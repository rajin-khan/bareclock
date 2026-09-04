# Security

Security fixes target the current `main` branch. There are no separately maintained release branches.

Please report suspected vulnerabilities through [GitHub private vulnerability reporting](https://github.com/rajin-khan/bareclock/security/advisories/new). Include reproduction steps, the affected browser, and the potential impact. Keep sensitive details out of public issues until a fix is available.

For ordinary bugs, use the [issue tracker](https://github.com/rajin-khan/bareclock/issues).

bareclock runs in the browser without an application backend. Preferences use local browser storage, and a service worker caches app files and city data. It does not request device location or send clock preferences to a server. Hosting providers may keep standard request logs.
