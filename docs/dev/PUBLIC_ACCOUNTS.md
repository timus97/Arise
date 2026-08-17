# Free platforms to set up (operator)

You create these accounts. I cannot open cloud consoles for you (identity + card checks). After you finish **one host** plus DuckDNS (if that host is on the public internet) and reply with the public values, the app can go live.

Localhost Compose is unchanged. This is only the friends-and-family public overlay.

**Oracle Cloud is optional.** If signup, verification, or “Out of host capacity” blocked you, skip it. Use a path in [If Oracle does not work](#if-oracle-does-not-work).

---

## What you must create

Pick **one host** from the first row group, then DuckDNS unless the host is Tailscale.

| # | Platform | Cost | Why | Signup |
| --- | --- | --- | --- | --- |
| 1a | **Home PC / always-on laptop** (preferred if Oracle failed) | $0 | Same Docker Compose, on a machine you already own | none — Docker Desktop or Docker Engine |
| 1b | **Google Cloud e2-micro** | $0 Always Free | Tiny public VM (1 GB RAM). Build the image on your PC, not on the VM | https://cloud.google.com/free |
| 1c | **Hetzner Cloud CX22** (or similar) | ~€4 / month | Small paid VPS. Most reliable if you will spend a little | https://www.hetzner.com/cloud |
| 1d | **Oracle Cloud Always Free** | $0 | Original pick. Skip if it already failed | https://www.oracle.com/cloud/free/ |
| 2 | **DuckDNS** | $0 | Hostname for HTTPS (`something.duckdns.org`). Not needed for Tailscale | https://www.duckdns.org/ |
| 2b | **Tailscale** (only if home PC has no public IP / CGNAT) | $0 | HTTPS to your PC without opening router ports | https://login.tailscale.com/start |

## Already done

| Platform | Status |
| --- | --- |
| **GitHub** (`timus97/Arise`) | Source of the image. No new account. |

## No account needed (automatic)

| Thing | Role |
| --- | --- |
| **Docker Engine + Compose** | Installed on the Oracle VM from Ubuntu packages |
| **Caddy** | Official image `caddy:2-alpine`. Gets a Let’s Encrypt cert by itself |
| **Let’s Encrypt** | No signup. Caddy talks to them on first `https://` request |

## Do **not** create (wrong host for this app)

Cloudflare Workers, Pages, Vercel, Netlify, Render free, Fly.io new free, Railway trial, App Store, Google Play.

## Optional later (not required to go live)

| Platform | Why | Signup |
| --- | --- | --- |
| UptimeRobot | Free ping of `https://HOST/health` | https://uptimerobot.com/ |
| Resend or Brevo | Password-reset email. Without this, you reset via SSH / local CLI | https://resend.com/ or https://www.brevo.com/ |
| Cloudflare | Named tunnel if you buy a domain later. Not required for DuckDNS or Tailscale | https://dash.cloudflare.com/ |
| Backblaze B2 | Extra off-box backup | skip for now |

---

## If Oracle does not work

Oracle signup and Ampere capacity fail often. **Do not keep retrying.** Pick one of these.

| Pick this if… | Host | Extra account | Cost |
| --- | --- | --- | --- |
| You have a PC/laptop that can stay on, and you can port-forward 80/443 | That PC | DuckDNS | $0 |
| Same PC, but home internet is CGNAT / no public IP | That PC | **Tailscale** (skip DuckDNS) | $0 |
| You want a public cloud VM and will accept a small box | Google Cloud e2-micro | DuckDNS | $0 |
| You will spend a few euros so it just works | Hetzner CX22 | DuckDNS | ~€4/mo |

Same app command on every Linux host:

`docker compose -f docker-compose.public.yml up --build -d`

### A. Home PC + DuckDNS (best $0)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux). Confirm `docker compose version`.
2. Create the DuckDNS name (section 2). Set its IP to **your home public IP** (search “what is my IP”).
3. On the router, port-forward **80** and **443** TCP to the PC’s LAN IP.
4. If “what is my IP” is a CGNAT address (`10.*`, `100.64–100.127.*`, or the ISP says no inbound ports), stop and use **path B**.
5. Clone the repo on that PC, fill `.env` with `https://yourname.duckdns.org`, run the public compose file.
6. Reply with the DuckDNS hostname and “host = home PC”.

### B. Home PC + Tailscale (best $0 behind CGNAT)

Testers install the free Tailscale app (or you turn on **Funnel** so they do not have to).

1. Create an account at https://login.tailscale.com/start (GitHub login is fine).
2. Install Tailscale on the PC that will run Arise. Sign in. Enable **MagicDNS** and **HTTPS Certificates** in the admin console (DNS settings).
3. Install Docker. Run Arise bound to localhost (localhost compose or public compose behind Tailscale Serve).
4. Expose it:
   - **Private (recommended):** friends install Tailscale, open `https://<machine>.<tailnet>.ts.net`. No open router ports.
   - **Public Funnel:** `tailscale funnel 443` so they need no Tailscale app. Personal-use limits apply.
5. Set `APP_ORIGIN` / `BETTER_AUTH_URL` to that `https://….ts.net` URL (not localhost).
6. Reply with the `*.ts.net` hostname and whether friends will install Tailscale.

### C. Google Cloud e2-micro (Always Free VM)

https://cloud.google.com/free — still a card + identity check. The VM is **1 GB RAM**. It can *run* the already-built image; it will **OOM if you build on the VM**.

1. Create a project. Enable Compute Engine.
2. Create a VM: region **us-west1**, **us-central1**, or **us-east1** only (Always Free).
3. Machine type **e2-micro**. Boot disk **Ubuntu 24.04**, size **30 GB** Standard persistent disk (the free disk cap).
4. Firewall: allow HTTP and HTTPS (or add tcp:80 and tcp:443).
5. Do **not** run `docker compose up --build` on this box. Build on your PC (or we add a GHCR image later) and copy/pull the image.
6. DuckDNS → the VM’s external IP. Caddy as in `docker-compose.public.yml`.
7. Reply with the external IP and DuckDNS name.

Watch billing: any shape other than e2-micro, or a disk over 30 GB, or a lot of egress, can charge. Set a budget alert at $1.

### D. Hetzner (cheap, recommended if you will pay)

1. https://www.hetzner.com/cloud → sign up.
2. Create **CX22** (x86, 2 vCPU / 4 GB) Ubuntu 24.04. Add your SSH key. Location: nearest.
3. Firewall: 22 (your IP), 80, 443.
4. DuckDNS → the VPS IPv4.
5. SSH in; we run the same public compose **build on the server** (4 GB is enough).
6. Reply with the IPv4 and DuckDNS name.

---

## 1. Oracle Cloud Always Free (skip if it already failed)

### Sign up

1. Open https://www.oracle.com/cloud/free/ → **Start for free**.
2. Use a real email and phone. Oracle will send verification codes.
3. They usually ask for a **credit/debit card**. Always Free is still $0 if you only create the shapes below. Watch the welcome mail; do not click “upgrade to paid” unless you mean to.
4. Pick a **home region** and do not change it later. Prefer a region that still has Ampere capacity (often US West / US East / Frankfurt — if create fails with “Out of host capacity”, try another region by signing up is **not** possible; instead retry instance create at off-peak or try the other availability domain).
5. Finish login to the **OCI Console**.

### Create the VM

1. Console → **Compute** → **Instances** → **Create instance**.
2. Name: `arise`.
3. Image: **Canonical Ubuntu 24.04** (or 22.04).
4. Shape: **Change shape** → **Ampere** → `VM.Standard.A1.Flex`.
   - **OCPUs: 2**
   - **Memory: 12 GB**
   - Do **not** pick the AMD `E2.1.Micro` (1 GB) — it cannot build this image.
5. Networking: use the default VCN. **Assign a public IPv4 address**.
6. SSH keys: **paste your public key** (`*.pub`). Keep the private key on your PC only. Never put the private key in GitHub or in this chat.
7. Boot volume: default (~47–50 GB) is enough.
8. Create. Wait until state is **Running**. Copy the **Public IP**.

### Open the firewall (required or HTTPS will fail)

Oracle’s default security list is often **SSH only**.

1. Instance → subnet → **Security list** (or **Network security group**).
2. **Add ingress rules** (source `0.0.0.0/0` unless you want to lock SSH):

| Source | Protocol | Ports | Why |
| --- | --- | --- | --- |
| Your home IP `/32` | TCP | 22 | SSH. Prefer this over 0.0.0.0/0 |
| `0.0.0.0/0` | TCP | 80 | Let’s Encrypt HTTP-01 + redirect |
| `0.0.0.0/0` | TCP | 443 | HTTPS for testers + PWA |

3. Do **not** open **8787**. Caddy talks to Arise on the Docker network only.

### First SSH (from your PC)

```bash
ssh -i PATH_TO_PRIVATE_KEY ubuntu@PUBLIC_IP
```

If the image user is `opc` (Oracle Linux) use that instead. Ubuntu is `ubuntu`.

Leave the VM running. Do not install the app yet unless you want to — I will drive deploy after you send the public values.

---

## 2. DuckDNS

1. Open https://www.duckdns.org/
2. Sign in with **GitHub** (you already have this) or Google.
3. Under **subdomains**, create one name, e.g. `arise-ff` → hostname becomes `arise-ff.duckdns.org`.
4. Click **add domain**.
5. Copy:
   - **Hostname:** `arise-ff.duckdns.org` (your name)
   - **Token:** the long token on the page (treat like a password)
6. Optional now: in the DuckDNS box, set the IP to the Oracle **Public IP** and click **update ip**. We can also run an updater on the VM later so a new IP does not break phones.

Do not put the DuckDNS token in the GitHub repo.

---

## 3. Secrets to generate on your PC (not a website)

In PowerShell:

```powershell
# session secret (never reuse the laptop .env)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# invite code (give testers this; not "arise" / "family")
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
```

Or Git Bash / WSL: `openssl rand -base64 32` and `openssl rand -hex 12`.

---

## Reply here when the two accounts are done

Paste **only** these public values (no private keys, no card numbers):

```text
Host I picked: home-pc-duckdns / home-pc-tailscale / google-e2-micro / hetzner / oracle
Public IP (if any):
DuckDNS or ts.net hostname:
SSH or Docker works on that host: yes/no
```

Keep on your machine (secrets go in `.env` on the host, not in git):

- SSH private key (cloud VMs)
- DuckDNS token
- `BETTER_AUTH_SECRET`
- `REGISTER_INVITE_CODE`

After that reply I can give the exact commands to install Docker, clone `timus97/Arise`, and `docker compose -f docker-compose.public.yml up --build -d`.
