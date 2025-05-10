<p align="center">
  <img src="assets/logo.png" alt="OpsCtrl Logo" width="250" />
</p>

# Opsctrl CLI

Opsctrl is an open-source command-line tool that helps DevOps and platform engineers diagnose Kubernetes pod issues quickly and intelligently using logs, events, and LLM-powered suggestions.

> This CLI is part of the **Opsctrl** platform. While the CLI is open source, the full SaaS backend offers incident memory, audit trails, Slack integrations, and team dashboards.

---

## ✨ Features

* Diagnose pod issues via logs and events
* Receive GPT-powered suggestions and explanations
* Automatically log incidents to the backend
* CLI-authenticated using `opsctrl login`
* Works with your existing Kube context

---

## ⚡ Quick Start

### Option 1: NPM (for Node.js users)

```bash
npm install -g opsctrl
```

### Option 2: GitHub Release (recommended)

```bash
curl -sSL https://opsctrl.dev/install.sh | bash
```

This will install the latest binary for your system from the GitHub Releases.

### Option 3: Homebrew (macOS/Linux)

```bash
brew install opsctrl/tap/opsctrl
```

---

## 🚀 Commands

### `opsctrl login`

Authenticate with your Opsctrl Cloud account. Uses a device code flow (like Azure CLI or GitHub CLI).

### `opsctrl diagnose <pod>`

Diagnose a pod in a specific namespace. Gathers logs and events, sends to backend for analysis.

```bash
opsctrl diagnose nginx-crash --namespace dev
```

### `opsctrl fix <pod>` *(coming soon)*

Preview or apply suggested fixes.

---

## 🔐 Authentication

* Tokens are stored securely in `~/.opsctrl/credentials.json`
* Tokens are JWTs issued by Opsctrl backend
* Automatically included in all CLI requests

---

## ✨ Contributing

This CLI is open to community contributions under a non-commercial license. Please open issues, submit PRs, or request features.

---

## ℹ About

Opsctrl CLI is maintained by the Opsctrl team. The tool is designed to be open, secure, and composable for real-world DevOps workflows.

For access to the Opsctrl Cloud features (team memory, dashboards, Slack), visit [https://opsctrl.dev](https://opsctrl.dev).

---

## ✉ Contact

Email: [hello@opsctrl.dev](mailto:hello@opsctrl.dev)
Twitter: [@opsctrl](https://twitter.com/opsctrl)
Website: [https://opsctrl.dev](https://opsctrl.dev)

---

## © License

See [LICENSE](./LICENSE) for details.

---

# LICENSE

Copyright (c) 2025 Opsctrl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to use, copy, modify, and merge the Software for **non-commercial purposes only**, subject to the following conditions:

1. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
2. The Software shall not be used, copied, modified, or distributed for commercial purposes, including but not limited to incorporation into proprietary systems, SaaS offerings, or for providing paid services, without explicit written permission from the copyright holders.
3. Redistribution of modified or unmodified versions of the Software must retain this license.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

---

If you would like to request a commercial license, please contact: [licensing@opsctrl.dev](mailto:licensing@opsctrl.dev)
