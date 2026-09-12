/**
 * admob.js - Gerenciador Oficial de Monetização Google AdMob & Google Ads
 * Suporta Android Nativo (Capacitor), PWA Web e WebViews.
 */

const ADMOB_CONFIG = {
  // ID do Aplicativo AdMob Oficial
  appId: 'ca-app-pub-2871403878275209~7634642461',
  
  // Blocos de Anúncios Reais (Produção)
  units: {
    banner: 'ca-app-pub-2871403878275209/5915095639',
    interstitial: 'ca-app-pub-2871403878275209/7228177302',
    appOpen: 'ca-app-pub-2871403878275209/7976940747',
    native: 'ca-app-pub-2871403878275209/7356169815'
  },

  // IDs Oficiais de Amostra/Teste do Google (obrigatórios para desenvolvimento e homologação)
  testUnits: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    appOpen: 'ca-app-pub-3940256099942544/9257399558',
    native: 'ca-app-pub-3940256099942544/2247696110'
  },

  // MODO DE TESTE ATIVADO: Garante que os anúncios de teste do Google apareçam sem penalizar a conta
  isTestMode: true
};

class AdMobManager {
  constructor() {
    this.config = ADMOB_CONFIG;
    this.isNativePluginAvailable = false;
    this.hasShownAppOpen = false;
    this.lastInterstitialTime = 0;
  }

  /**
   * Inicializa o serviço de anúncios e detecta o ambiente
   */
  async init() {
    console.log('[AdMob] Inicializando Google Mobile Ads SDK (TestMode: ' + this.config.isTestMode + ')...');

    // 1. Detecta ambiente nativo Android (Capacitor AdMob Plugin)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
      try {
        const { AdMob } = window.Capacitor.Plugins;
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          testingDevices: ['EMULATOR'],
          initializeForTesting: this.config.isTestMode
        });
        this.isNativePluginAvailable = true;
        console.log('[AdMob] SDK Nativo Capacitor inicializado com sucesso.');
        
        // Exibe banner nativo
        await this.showNativeBanner();
      } catch (err) {
        console.warn('[AdMob] Falha ao inicializar plugin nativo Capacitor:', err);
      }
    }

    // 2. Renderiza banners na interface visual (Web/PWA ou fallback visual)
    this.renderWebBanner();
    this.renderNativeAd('admob-native-slot');

    // 3. Exibe anúncio de Abertura do App (App Open Ad) após carregamento inicial
    setTimeout(() => {
      this.showAppOpenAd();
    }, 1500);
  }

  /**
   * Exibe Banner nativo via Capacitor AdMob
   */
  async showNativeBanner() {
    if (this.isNativePluginAvailable && window.Capacitor?.Plugins?.AdMob) {
      try {
        const { AdMob } = window.Capacitor.Plugins;
        const unitId = this.config.isTestMode ? this.config.testUnits.banner : this.config.units.banner;
        await AdMob.showBanner({
          adId: unitId,
          adSize: 'ADAPTIVE_BANNER',
          position: 'BOTTOM_CENTER',
          margin: 0,
          isTesting: this.config.isTestMode
        });
        console.log('[AdMob Native] Banner nativo ativo no rodapé.');
        return;
      } catch (err) {
        console.warn('[AdMob Native] Erro ao renderizar banner nativo:', err);
      }
    }

    // Fallback: renderiza banner inline visual no container do app
    this.renderWebBanner();
  }

  /**
   * Carrega a biblioteca Google Ads para exibição na Web (quando em produção)
   */
  loadWebAdsSdk() {
    if (document.getElementById('google-ads-sdk')) return;

    try {
      const script = document.createElement('script');
      script.id = 'google-ads-sdk';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2871403878275209';
      script.onload = () => {
        console.log('[AdMob Web] Tag Google Ads carregada.');
        this.renderWebBanner();
      };
      document.head.appendChild(script);
    } catch (_) {}
  }

  /**
   * Renderiza o bloco de Banner no local reservado
   */
  renderWebBanner() {
    const slot = document.getElementById('admob-banner-slot');
    if (!slot) return;

    const unitId = this.config.isTestMode ? this.config.testUnits.banner : this.config.units.banner;

    // Em modo de teste (ou ambiente local/webview), renderiza o banner de teste interativo
    if (this.config.isTestMode || window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
      slot.innerHTML = `
        <div class="admob-badge">Google AdMob • Teste</div>
        <div class="admob-inner-content" style="cursor: pointer;" onclick="window.admobManager.showInterstitial()">
          <div style="font-size: 1.6rem; background: #e0f2fe; padding: 0.35rem 0.5rem; border-radius: 8px;">🏷️</div>
          <div style="flex: 1; min-width: 0;">
            <strong style="display: block; font-size: 0.82rem; color: #0f172a;">Anúncio de Teste AdMob (Banner 320x50)</strong>
            <span style="font-size: 0.7rem; color: #64748b;">Bloco: ${unitId}</span>
          </div>
          <button type="button" class="btn btn-outline btn-sm" style="font-size: 0.68rem; padding: 0.2rem 0.5rem;">
            Testar
          </button>
        </div>
      `;
      return;
    }

    // Em produção em domínio público com adsense aprovado
    try {
      this.loadWebAdsSdk();
      slot.innerHTML = `
        <div class="admob-badge">Anúncio • AdMob</div>
        <ins class="adsbygoogle"
             style="display:block; width:100%; min-height:60px;"
             data-ad-client="ca-pub-2871403878275209"
             data-ad-slot="${unitId.split('/')[1] || '5915095639'}"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      `;
      if (window.adsbygoogle && window.adsbygoogle.push) {
        window.adsbygoogle.push({});
      }
    } catch (_) {}
  }

  /**
   * Renderiza anúncio Nativo Avançado inline
   */
  renderNativeAd(containerId = 'admob-native-slot') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const unitId = this.config.isTestMode ? this.config.testUnits.native : this.config.units.native;

    if (this.config.isTestMode || window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
      container.innerHTML = `
        <div class="admob-native-container">
          <div class="admob-badge">Nativo • AdMob Teste</div>
          <div style="display: flex; align-items: flex-start; gap: 0.75rem; margin-top: 0.25rem;">
            <div style="font-size: 1.8rem; background: #ecfdf5; padding: 0.4rem 0.6rem; border-radius: 8px;">💳</div>
            <div style="flex: 1;">
              <strong style="font-size: 0.88rem; color: var(--text-main); display: block;">
                Cartão com Cashback de Mercado
              </strong>
              <p style="margin: 0.2rem 0 0.5rem; font-size: 0.75rem; color: var(--text-muted); line-height: 1.3;">
                Economize até 5% nas compras do mês. Anúncio oficial de teste Google AdMob.
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.65rem; color: #94a3b8;">ID: ${unitId}</span>
                <button type="button" class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 0.25rem 0.65rem;" onclick="window.admobManager.showInterstitial()">
                  Saiba Mais
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admob-native-container">
        <div class="admob-badge">Nativo • AdMob</div>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-format="fluid"
             data-ad-layout-key="-fb+5w+4e-db+86"
             data-ad-client="ca-pub-2871403878275209"
             data-ad-slot="${unitId.split('/')[1] || '7356169815'}"></ins>
      </div>
    `;
    try {
      if (window.adsbygoogle && window.adsbygoogle.push) {
        window.adsbygoogle.push({});
      }
    } catch (_) {}
  }

  /**
   * Exibe anúncio de Abertura do App (App Open Ad)
   */
  async showAppOpenAd() {
    if (this.hasShownAppOpen) return;
    this.hasShownAppOpen = true;

    // Ambiente nativo Capacitor
    if (this.isNativePluginAvailable && window.Capacitor?.Plugins?.AdMob) {
      try {
        const { AdMob } = window.Capacitor.Plugins;
        const unitId = this.config.isTestMode ? this.config.testUnits.appOpen : this.config.units.appOpen;
        await AdMob.prepareAppOpen({ adId: unitId });
        await AdMob.showAppOpen();
        return;
      } catch (err) {
        console.warn('[AdMob Native] Falha ao exibir App Open nativo:', err);
      }
    }

    // Exibe overlay elegante de boas-vindas
    this.displayWebOverlayAd({
      type: 'Abertura do App (AdMob Teste)',
      unitId: this.config.isTestMode ? this.config.testUnits.appOpen : this.config.units.appOpen,
      duration: 4,
      headline: 'Bem-vindo ao Compras Plus!',
      subtext: 'Planeje suas listas e controle seus gastos no mercado com facilidade.'
    });
  }

  /**
   * Exibe anúncio Intersticial de Tela Cheia (ex: ao Finalizar Compra)
   */
  async showInterstitial(onAdClosedCallback) {
    const now = Date.now();
    // Em modo de teste, limite de apenas 3 segundos para facilitar testes contínuos
    const cooldown = this.config.isTestMode ? 3000 : 30000;
    if (now - this.lastInterstitialTime < cooldown) {
      if (typeof onAdClosedCallback === 'function') onAdClosedCallback();
      return;
    }
    this.lastInterstitialTime = now;

    // 1. Tenta exibir via SDK Nativo do Capacitor
    if (this.isNativePluginAvailable && window.Capacitor?.Plugins?.AdMob) {
      try {
        const { AdMob } = window.Capacitor.Plugins;
        const unitId = this.config.isTestMode ? this.config.testUnits.interstitial : this.config.units.interstitial;
        console.log('[AdMob Native] Carregando intersticial nativo:', unitId);
        await AdMob.prepareInterstitial({
          adId: unitId,
          isTesting: this.config.isTestMode
        });
        await AdMob.showInterstitial();
        if (typeof onAdClosedCallback === 'function') onAdClosedCallback();
        return;
      } catch (err) {
        console.warn('[AdMob Native] Falha no intersticial nativo, usando overlay de teste:', err);
      }
    }

    // 2. Fallback: Overlay Intersticial Interativo para Testes
    this.displayWebOverlayAd({
      type: 'Anúncio Intersticial (AdMob Teste)',
      unitId: this.config.isTestMode ? this.config.testUnits.interstitial : this.config.units.interstitial,
      duration: 4,
      headline: '🎉 Compra Finalizada com Sucesso!',
      subtext: 'Anúncio Intersticial Oficial do Google AdMob em Modo de Teste.',
      onClose: onAdClosedCallback
    });
  }

  /**
   * Constrói overlay de anúncio na Web para simular App Open ou Intersticial
   */
  displayWebOverlayAd({ type, unitId, duration = 4, headline, subtext, onClose }) {
    const old = document.getElementById('admob-overlay-screen');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'admob-overlay-screen';
    overlay.className = 'admob-fullscreen-overlay';

    let countdown = duration;

    overlay.innerHTML = `
      <div class="admob-overlay-card">
        <div class="admob-overlay-header">
          <span class="admob-badge" style="position: static; border-radius: 4px; padding: 0.2rem 0.5rem;">
            ${type || 'Google AdMob • Teste'}
          </span>
          <button id="btn-close-overlay-ad" class="btn-ad-close" disabled>
            Aguarde ${countdown}s...
          </button>
        </div>
        
        <div class="admob-overlay-body">
          <div class="admob-ad-preview-box">
            <div style="font-size: 2.8rem; margin-bottom: 0.5rem;">🛍️</div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.35rem;">
              ${headline || 'Compras Plus'}
            </h3>
            <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.25rem;">
              ${subtext || 'Economize nas compras do mês com orçamentos em tempo real.'}
            </p>
            <div style="font-size: 0.72rem; color: #0369a1; background: #e0f2fe; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px dashed #7dd3fc; word-break: break-all;">
              🏷️ <strong>Bloco de Teste Google AdMob:</strong><br>${unitId}
            </div>
          </div>
        </div>

        <div class="admob-overlay-footer" style="margin-top: 1rem;">
          <small style="font-size: 0.72rem; color: #94a3b8;">
            Modo de Teste Oficial AdMob • Ativo e Funcional
          </small>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnClose = overlay.querySelector('#btn-close-overlay-ad');

    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        if (btnClose) btnClose.textContent = `Aguarde ${countdown}s...`;
      } else {
        clearInterval(timer);
        if (btnClose) {
          btnClose.disabled = false;
          btnClose.className = 'btn-ad-close active';
          btnClose.textContent = '✕ Pular Anúncio';
        }
      }
    }, 1000);

    const closeAd = () => {
      clearInterval(timer);
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 250);
      if (typeof onClose === 'function') onClose();
    };

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (!btnClose.disabled) closeAd();
      });
    }
  }
}

// Instância global do AdMob
const admobManager = new AdMobManager();
window.admobManager = admobManager;

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => admobManager.init());
} else {
  admobManager.init();
}
