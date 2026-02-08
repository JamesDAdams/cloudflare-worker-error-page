import requests
import socket
import time
import os
from datetime import datetime

CF_ACCOUNT_ID = os.environ["CF_ACCOUNT_ID"]
CF_NAMESPACE_ID = os.environ["CF_NAMESPACE_ID"]
CF_API_TOKEN = os.environ["CF_API_TOKEN"]
KV_IP_KEY = os.environ.get("KV_IP_KEY", "wan-ip")
KV_4G_KEY = os.environ.get("KV_4G_KEY", "wan-is-4g")
SLEEP_SECONDS = int(os.environ.get("SLEEP_SECONDS", 60))

# UPS monitoring via NUT
ENABLE_UPS_CHECK = os.environ.get("ENABLE_UPS_CHECK", "false").lower() == "true"
NUT_HOST = os.environ.get("NUT_HOST", "")
NUT_PORT = int(os.environ.get("NUT_PORT", 3493))
NUT_UPS_NAME = os.environ.get("NUT_UPS_NAME", "")
KV_UPS_KEY = os.environ.get("KV_UPS_KEY", "ups-on-battery")

def get_wan_ip():
    return requests.get("https://api.ipify.org").text.strip()

def get_kv_url(key):
    return f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/storage/kv/namespaces/{CF_NAMESPACE_ID}/values/{key}"

def update_cloudflare_kv(key, value):
    url = get_kv_url(key)
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "text/plain"
    }
    resp = requests.put(url, data=value, headers=headers)
    resp.raise_for_status()

def is_mobile_ip(ip):
    # Query ip-api.com for network details
    resp = requests.get(f"http://ip-api.com/json/{ip}?fields=mobile,org,as,isp")
    data = resp.json()
    # ip-api.com returns 'mobile': True if the connection is mobile (4G/5G)
    return bool(data.get("mobile", False))

def get_ups_status(host, port, ups_name):
    """Query NUT server for UPS status via raw socket.
    Returns the ups.status string (e.g. 'OL', 'OB', 'OB LB') or None on error.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    try:
        sock.connect((host, port))
        cmd = f"GET VAR {ups_name} ups.status\n"
        sock.sendall(cmd.encode())
        data = sock.recv(1024).decode().strip()
        # Expected: VAR <upsname> ups.status "OL"
        if data.startswith("VAR") and '"' in data:
            status = data.split('"')[1]
            return status
        return None
    finally:
        try:
            sock.sendall(b"LOGOUT\n")
        except Exception:
            pass
        sock.close()

def is_ups_on_battery(host, port, ups_name):
    """Returns True if the UPS is running on battery (OB in status)."""
    status = get_ups_status(host, port, ups_name)
    if status is None:
        return None
    return "OB" in status

def log(msg, level="INFO"):
    now = datetime.now().isoformat(timespec="seconds")
    print(f"[{now}] [{level}] {msg}")

def check_ip(state):
    """Check WAN IP and 4G status, update KV if changed. Returns updated state."""
    ip = get_wan_ip()
    log(f"Retrieved IP: {ip} (last: {state['ip']})")
    is_4g = is_mobile_ip(ip)
    log(f"Is mobile (4G/5G): {is_4g}")

    if ip != state["ip"]:
        log("IP change detected, updating Cloudflare KV.")
        update_cloudflare_kv(KV_IP_KEY, ip)
        state["ip"] = ip

    if is_4g != state["is_4g"]:
        log("Connection type change detected, updating Cloudflare KV.")
        update_cloudflare_kv(KV_4G_KEY, str(is_4g).lower())
        state["is_4g"] = is_4g

def check_ups(state):
    """Check UPS battery status via NUT, update KV if changed. Returns updated state."""
    on_battery = is_ups_on_battery(NUT_HOST, NUT_PORT, NUT_UPS_NAME)
    if on_battery is None:
        log("Could not read UPS status from NUT server.", level="WARN")
        return

    log(f"UPS on battery: {on_battery}")
    if on_battery != state["ups_on_battery"]:
        log("UPS status change detected, updating Cloudflare KV.")
        update_cloudflare_kv(KV_UPS_KEY, str(on_battery).lower())
        state["ups_on_battery"] = on_battery

def main():
    state = {"ip": None, "is_4g": None, "ups_on_battery": None}
    ups_enabled = ENABLE_UPS_CHECK and NUT_HOST and NUT_UPS_NAME

    if ENABLE_UPS_CHECK and not ups_enabled:
        log("UPS check enabled but NUT_HOST or NUT_UPS_NAME not set, disabling UPS check.", level="WARN")
    elif ups_enabled:
        log(f"UPS monitoring enabled: {NUT_UPS_NAME}@{NUT_HOST}:{NUT_PORT}")

    while True:
        try:
            check_ip(state)
        except Exception as e:
            log(str(e), level="ERROR")

        if ups_enabled:
            try:
                check_ups(state)
            except Exception as e:
                log(f"UPS check error: {e}", level="ERROR")

        time.sleep(SLEEP_SECONDS)

if __name__ == "__main__":
    main()