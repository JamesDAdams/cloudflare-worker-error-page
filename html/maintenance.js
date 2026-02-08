export default function maintenanceHtml(globalMaintenance, subdomainsMaintenance = [], bannerSubdomains = [], bannerMessage = '', language = 'FR', options = {}) {
  const { enable4g = false, is4gMode = false, enableUps = false, upsOnBattery = false } = options;

  const texts = {
    FR: {
      title: 'Contrôle Maintenance',
      globalMaintenance: 'Maintenance globale',
      active: 'active',
      inactive: 'inactive',
      toggleGlobal: 'Basculer l\'état global',
      subdomainsTitle: 'Sous-domaines en maintenance',
      remove: 'Retirer',
      addSubdomainPlaceholder: 'Ajouter un sous-domaine',
      add: 'Ajouter',
      bannerTitle: 'Bandeau personnalisé',
      bannerMessageLabel: 'Message du bandeau :',
      update: 'Mettre à jour',
      addBannerSubdomainLabel: 'Ajouter un sous-domaine pour le bandeau :',
      bannerSubdomainPlaceholder: 'ex: admin.monsite.com ou *.monsite.com',
      bannerInfo: 'Le bandeau s\'affiche sur les sous-domaines listés ci-dessus. Utilisez *.domaine.fr pour cibler tous les sous-domaines.',
      mode4gTitle: 'Mode 4G',
      toggle4g: 'Basculer le mode 4G',
      upsTitle: 'Onduleur (UPS)',
      upsOnBattery: 'Sur batterie',
      upsOnLine: 'Sur secteur',
      toggleUps: 'Basculer le mode UPS'
    },
    EN: {
      title: 'Maintenance Control',
      globalMaintenance: 'Global maintenance',
      active: 'active',
      inactive: 'inactive',
      toggleGlobal: 'Toggle global state',
      subdomainsTitle: 'Subdomains in maintenance',
      remove: 'Remove',
      addSubdomainPlaceholder: 'Add a subdomain',
      add: 'Add',
      bannerTitle: 'Custom Banner',
      bannerMessageLabel: 'Banner message:',
      update: 'Update',
      addBannerSubdomainLabel: 'Add a subdomain for the banner:',
      bannerSubdomainPlaceholder: 'ex: admin.mysite.com or *.mysite.com',
      bannerInfo: 'The banner is displayed on the subdomains listed above. Use *.domain.com to target all subdomains.',
      mode4gTitle: '4G Mode',
      toggle4g: 'Toggle 4G mode',
      upsTitle: 'UPS',
      upsOnBattery: 'On battery',
      upsOnLine: 'On line power',
      toggleUps: 'Toggle UPS mode'
    }
  };

  const t = texts[language] || texts.FR;
  const htmlLang = language === 'EN' ? 'en' : 'fr';

  const mode4gClass = is4gMode ? '' : 'inactive';
  const mode4gLabel = is4gMode ? t.active : t.inactive;
  const section4g = enable4g ? `
      <div class="section">
        <h2>${t.mode4gTitle}</h2>
        <div class="status ${mode4gClass}">
          ${t.mode4gTitle}: ${mode4gLabel}
        </div>
        <button onclick="toggle4g()">${t.toggle4g}</button>
      </div>` : '';

  const upsClass = upsOnBattery ? 'inactive' : '';
  const upsLabel = upsOnBattery ? t.upsOnBattery : t.upsOnLine;
  const sectionUps = enableUps ? `
      <div class="section">
        <h2>${t.upsTitle}</h2>
        <div class="status ${upsClass}">
          ${t.upsTitle}: ${upsLabel}
        </div>
        <button onclick="toggleUps()">${t.toggleUps}</button>
      </div>` : '';

  return `<!DOCTYPE html>
  <html lang="${htmlLang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #181c24 0%, #232a34 100%);
        color: #f5f6fa;
        font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
      }
      .container {
        background: rgba(30, 34, 44, 0.95);
        border-radius: 18px;
        box-shadow: 0 8px 32px 0 rgba(0,0,0,0.25);
        padding: 40px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 320px;
      }
      h1 {
        font-size: 2rem;
        margin-bottom: 18px;
        letter-spacing: 1px;
      }
      .status {
        margin-bottom: 24px;
        font-size: 1.1rem;
        color: #00e676;
        font-weight: 500;
      }
      .status.inactive {
        color: #ff5252;
      }
      button {
        background: linear-gradient(90deg, #00e676 0%, #00bfae 100%);
        color: #181c24;
        border: none;
        border-radius: 8px;
        padding: 14px 32px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: background 0.2s, transform 0.2s;
      }
      button:hover {
        background: linear-gradient(90deg, #00bfae 0%, #00e676 100%);
        transform: scale(1.05);
      }
      .section {
        width: 100%;
        margin-bottom: 24px;
        padding: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .subdomain-list, .banner-subdomain-list {
        margin: 16px 0;
      }
      .subdomain-controls, .banner-controls {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      input {
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #666;
        background: rgba(255,255,255,0.1);
        color: white;
      }
      .subdomain-item, .banner-subdomain-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: rgba(0,0,0,0.2);
        margin: 4px 0;
        border-radius: 4px;
      }
      .remove-btn {
        background: #ff5252;
        padding: 4px 8px;
      }
      .banner-preview {
        background:#ffc; color:#222; padding:12px; text-align:center; border-bottom:1px solid #eee; font-weight:bold; margin:16px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${t.title}</h1>
      <div class="section">
        <div class="status ${globalMaintenance ? '' : 'inactive'}">
          ${t.globalMaintenance}: ${globalMaintenance ? t.active : t.inactive}
        </div>
        <button onclick="toggleGlobal()">${t.toggleGlobal}</button>
      </div>
      <div class="section">
        <h2>${t.subdomainsTitle}</h2>
        <div class="subdomain-list">
          ${subdomainsMaintenance.map(sd => `<div class="subdomain-item">${sd} <button class="remove-btn" onclick="removeSubdomain('${sd}')">${t.remove}</button></div>`).join('')}
        </div>
        <div class="subdomain-controls">
          <input id="subdomain-input" placeholder="${t.addSubdomainPlaceholder}" />
          <button onclick="addSubdomain()">${t.add}</button>
        </div>
      </div>
      <div class="section">
        <h2>${t.bannerTitle}</h2>
        <div>
          <label for="banner-message">${t.bannerMessageLabel}</label>
          <input id="banner-message" value="${bannerMessage.replace(/"/g, '&quot;')}" />
          <button onclick="setBannerMessage()">${t.update}</button>
        </div>
        <div>
          <label for="banner-subdomain-input">${t.addBannerSubdomainLabel}</label>
          <input id="banner-subdomain-input" placeholder="${t.bannerSubdomainPlaceholder}" />
          <button onclick="addBannerSubdomain()">${t.add}</button>
        </div>
        <div class="banner-subdomain-list">
          ${bannerSubdomains.map(sd => `<div class="banner-subdomain-item">${sd} <button class="remove-btn" onclick="removeBannerSubdomain('${sd}')">${t.remove}</button></div>`).join('')}
        </div>
        ${bannerMessage ? `<div class="banner-preview">${bannerMessage}</div>` : ''}
        <div style="font-size:0.9em;color:#bbb;margin-top:8px;">${t.bannerInfo}</div>
      </div>
      ${section4g}
      ${sectionUps}
    </div>
    <script>
      async function toggleGlobal() {
        await fetch('/worker/api/toggle-maintenance/global', { method: 'POST' });
        location.reload();
      }
      async function addSubdomain() {
        const val = document.getElementById('subdomain-input').value.trim();
        if (!val) return;
        await fetch('/worker/api/maintenance/subdomain/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: val })
        });
        location.reload();
      }
      async function removeSubdomain(sd) {
        await fetch('/worker/api/maintenance/subdomain/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: sd })
        });
        location.reload();
      }
      async function setBannerMessage() {
        const val = document.getElementById('banner-message').value;
        await fetch('/worker/api/banner/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: val })
        });
        location.reload();
      }
      async function addBannerSubdomain() {
        const val = document.getElementById('banner-subdomain-input').value.trim();
        if (!val) return;
        await fetch('/worker/api/banner/subdomains/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: val })
        });
        location.reload();
      }
      async function removeBannerSubdomain(sd) {
        await fetch('/worker/api/banner/subdomains/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain: sd })
        });
        location.reload();
      }
      async function toggle4g() {
        await fetch('/worker/api/toggle-4g-mode', { method: 'POST' });
        location.reload();
      }
      async function toggleUps() {
        await fetch('/worker/api/toggle-ups-mode', { method: 'POST' });
        location.reload();
      }
    </script>
  </body>
  </html>`;
}
