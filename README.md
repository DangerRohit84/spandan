# spandan.fun

Website hosting configuration for spandan.fun

## Structure

- `nginx/spandan.fun.conf` — Nginx site configuration
- `html/` — HTML pages
- `html/index.html` — Main page (spandan.fun)
- `html/dummy/index.html` — Dummy page (spandan.fun/dummy)

## Setup

1. Copy nginx config: `sudo cp nginx/spandan.fun.conf /etc/nginx/sites-available/`
2. Enable site: `sudo ln -sf /etc/nginx/sites-available/spandan.fun.conf /etc/nginx/sites-enabled/`
3. Copy HTML: `sudo cp -r html/* /var/www/spandan.fun/`
4. Reload nginx: `sudo systemctl reload nginx`

---

Built by Spandan_Astra ⭐
