async function getStateObj(env) {
  const raw = await env.MAINTENANCE_KV.get('MAINTENANCE_STATE');
  try {
    return JSON.parse(raw || '') || {};
  } catch {
    return {};
  }
}

async function setStateObj(env, obj) {
  await env.MAINTENANCE_KV.put('MAINTENANCE_STATE', JSON.stringify(obj));
  invalidateCache();
}

function invalidateCache() {
  if (globalThis.cache) {
    globalThis.cache.maintenance = { value: null, ts: 0 };
    globalThis.cache.is4g = { value: null, ts: 0 };
    globalThis.cache.upsOnBattery = { value: null, ts: 0 };
  }
}

async function toggleGlobalMaintenance(env) {
  const obj = await getStateObj(env);
  obj.isGlobalMaintenance = !(obj.isGlobalMaintenance === true || obj.isGlobalMaintenance === 'true');
  await setStateObj(env, obj);
  return new Response('Maintenance globale mise à jour');
}

async function addMaintenanceSubdomain(request, env) {
  const { subdomain } = await request.json();
  const obj = await getStateObj(env);
  obj.subdomainsMaintenance = Array.isArray(obj.subdomainsMaintenance) ? obj.subdomainsMaintenance : [];
  if (!obj.subdomainsMaintenance.includes(subdomain)) {
    obj.subdomainsMaintenance.push(subdomain);
    await setStateObj(env, obj);
  }
  return new Response('Sous-domaine ajouté');
}

async function removeMaintenanceSubdomain(request, env) {
  const { subdomain } = await request.json();
  const obj = await getStateObj(env);
  obj.subdomainsMaintenance = Array.isArray(obj.subdomainsMaintenance) ? obj.subdomainsMaintenance : [];
  obj.subdomainsMaintenance = obj.subdomainsMaintenance.filter(d => d !== subdomain);
  await setStateObj(env, obj);
  return new Response('Sous-domaine retiré');
}

async function setBannerSubdomains(request, env) {
  const { subdomains } = await request.json();
  if (!Array.isArray(subdomains)) {
    return new Response('Format attendu: { subdomains: [...] }', { status: 400 });
  }
  const obj = await getStateObj(env);
  obj.bannerSubdomains = subdomains;
  await setStateObj(env, obj);
  return new Response('Liste des sous-domaines du bandeau mise à jour');
}

async function addBannerSubdomain(request, env) {
  const { subdomain } = await request.json();
  if (typeof subdomain !== 'string') return new Response('Format attendu: { subdomain: "..." }', { status: 400 });
  const obj = await getStateObj(env);
  obj.bannerSubdomains = Array.isArray(obj.bannerSubdomains) ? obj.bannerSubdomains : [];
  if (!obj.bannerSubdomains.includes(subdomain)) {
    obj.bannerSubdomains.push(subdomain);
    await setStateObj(env, obj);
  }
  return new Response('Sous-domaine ajouté au bandeau');
}

async function removeBannerSubdomain(request, env) {
  const { subdomain } = await request.json();
  if (typeof subdomain !== 'string') return new Response('Format attendu: { subdomain: "..." }', { status: 400 });
  const obj = await getStateObj(env);
  obj.bannerSubdomains = Array.isArray(obj.bannerSubdomains) ? obj.bannerSubdomains : [];
  obj.bannerSubdomains = obj.bannerSubdomains.filter(d => d !== subdomain);
  await setStateObj(env, obj);
  return new Response('Sous-domaine retiré du bandeau');
}

async function setBannerMessage(request, env) {
  const { message } = await request.json();
  if (typeof message !== 'string') {
    return new Response('Format attendu: { message: "..." }', { status: 400 });
  }
  const obj = await getStateObj(env);
  obj.bannerMessage = message;
  await setStateObj(env, obj);
  return new Response('Message du bandeau mis à jour');
}

async function toggle4gMode(env, state) {
  if (!env.ENABLE_4G_BANNER) {
    return new Response('Fonctionnalité 4G désactivée', { status: 403 });
  }
  await env.MAINTENANCE_KV.put('wan-is-4g', state.is4gMode ? 'false' : 'true');
  invalidateCache();
  return new Response('Mode 4G mis à jour');
}

async function set4gMode(request, env) {
  if (!env.ENABLE_4G_BANNER) {
    return new Response('Fonctionnalité 4G désactivée', { status: 403 });
  }
  const { enabled } = await request.json();
  if (typeof enabled !== 'boolean') {
    return new Response('Format attendu: { enabled: true/false }', { status: 400 });
  }
  await env.MAINTENANCE_KV.put('wan-is-4g', enabled ? 'true' : 'false');
  invalidateCache();
  return new Response('Mode 4G mis à jour');
}

async function toggleUpsMode(env, state) {
  if (!env.ENABLE_UPS_BANNER) {
    return new Response('Fonctionnalité UPS désactivée', { status: 403 });
  }
  await env.MAINTENANCE_KV.put('ups-on-battery', state.upsOnBattery ? 'false' : 'true');
  invalidateCache();
  return new Response('Mode UPS mis à jour');
}

async function setUpsMode(request, env) {
  if (!env.ENABLE_UPS_BANNER) {
    return new Response('Fonctionnalité UPS désactivée', { status: 403 });
  }
  const { enabled } = await request.json();
  if (typeof enabled !== 'boolean') {
    return new Response('Format attendu: { enabled: true/false }', { status: 400 });
  }
  await env.MAINTENANCE_KV.put('ups-on-battery', enabled ? 'true' : 'false');
  invalidateCache();
  return new Response('Mode UPS mis à jour');
}

// Route table: [pathname, method, handler]
const routes = [
  ['/worker/api/toggle-maintenance/global', 'POST', (req, env) => toggleGlobalMaintenance(env)],
  ['/worker/api/maintenance/subdomain/add', 'POST', (req, env) => addMaintenanceSubdomain(req, env)],
  ['/worker/api/maintenance/subdomain/remove', 'POST', (req, env) => removeMaintenanceSubdomain(req, env)],
  ['/worker/api/banner/subdomains', 'POST', (req, env) => setBannerSubdomains(req, env)],
  ['/worker/api/banner/subdomains/add', 'POST', (req, env) => addBannerSubdomain(req, env)],
  ['/worker/api/banner/subdomains/remove', 'POST', (req, env) => removeBannerSubdomain(req, env)],
  ['/worker/api/banner/message', 'POST', (req, env) => setBannerMessage(req, env)],
  ['/worker/api/toggle-4g-mode', 'POST', (req, env, state) => toggle4gMode(env, state)],
  ['/worker/api/4g-mode', 'POST', (req, env) => set4gMode(req, env)],
  ['/worker/api/toggle-ups-mode', 'POST', (req, env, state) => toggleUpsMode(env, state)],
  ['/worker/api/ups-mode', 'POST', (req, env) => setUpsMode(req, env)],
];

export async function handleApi(request, url, host, env, state) {
  if (host !== env.MAINTENANCE_DOMAIN) {
    return new Response(`Forbidden: Only accessible on ${env.MAINTENANCE_DOMAIN}`, { status: 403 });
  }

  const route = routes.find(([path, method]) => url.pathname === path && request.method === method);
  if (route) {
    return await route[2](request, env, state);
  }

  return new Response('Forbidden', { status: 403 });
}
