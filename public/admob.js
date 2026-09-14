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
        document.body.classList.add('has-native-ad-banner');
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
   * Oculta o banner nativo temporariamente (ex: enquanto modais/bottom sheets estiverem abertos)
   */
  async hideBanner() {
    if (this.isNativePluginAvailable && window.Capacitor?.Plugins?.AdMob) {
      try {
        await window.Capacitor.Plugins.AdMob.hideBanner();
      } catch (_) {}
    }
    document.body.classList.remove('has-native-ad-banner');
  }

  /**
   * Restaura a exibição do banner nativo após fechamento de modais
   */
  async resumeBanner() {
    if (this.isNativePluginAvailable && window.Capacitor?.Plugins?.AdMob) {
      try {
        await window.Capacitor.Plugins.AdMob.resumeBanner();
        document.body.classList.add('has-native-ad-banner');
      } catch (_) {
        this.showNativeBanner();
      }
    }
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

    // Banner de Teste Visual Oficial do Google AdMob (sem IDs técnicos brutos)
    slot.innerHTML = `
      <div class="admob-badge" style="background: #16a34a; color: #fff; font-weight: 800; font-size: 0.65rem; border-radius: 4px; padding: 0.15rem 0.45rem;">
        Anúncio de Teste Google
      </div>
      <div class="admob-inner-content" style="cursor: pointer; display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem;" onclick="window.admobManager.showInterstitial()">
        <div style="font-size: 1.8rem; background: linear-gradient(135deg, #e0f2fe, #bae6fd); padding: 0.35rem 0.55rem; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">🛒</div>
        <div style="flex: 1; min-width: 0;">
          <strong style="display: block; font-size: 0.84rem; color: #0f172a; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            Supermercado Express • Ofertas da Semana
          </strong>
          <span style="font-size: 0.72rem; color: #475569; display: block; line-height: 1.3;">
            Economize até 25% em hortifrúti e carnes com cupons do dia.
          </span>
        </div>
        <button type="button" class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 0.35rem 0.65rem; font-weight: 700; white-space: nowrap; border-radius: 6px;">
          CONFERIR
        </button>
      </div>
    `;
  }

  /**
   * Renderiza anúncio Nativo Avançado inline
   */
  renderNativeAd(containerId = 'admob-native-slot') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="admob-native-container" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span class="admob-badge" style="position: static; background: #16a34a; color: #fff; font-size: 0.62rem; font-weight: 800; border-radius: 4px; padding: 0.15rem 0.45rem;">
            Anúncio • Google AdMob
          </span>
          <span style="font-size: 0.72rem; color: #f59e0b; font-weight: 700;">
            ★★★★★ 4.9 <span style="color: var(--text-muted); font-weight: 400;">(24k)</span>
          </span>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
          <div style="font-size: 2rem; background: linear-gradient(135deg, #ecfdf5, #a7f3d0); padding: 0.5rem 0.65rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">💳</div>
          <div style="flex: 1; min-width: 0;">
            <strong style="font-size: 0.92rem; color: var(--text-main); display: block; font-weight: 700;">
              Cartão Mercado Fácil com Cashback
            </strong>
            <p style="margin: 0.25rem 0 0.65rem; font-size: 0.78rem; color: var(--text-muted); line-height: 1.35;">
              Receba de volta 5% de todas as suas compras em qualquer supermercado do país. Sem anuidade no primeiro ano.
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.7rem; color: #16a34a; font-weight: 600;">
                ✓ Aprovado na Hora
              </span>
              <button type="button" class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 0.35rem 0.85rem; font-weight: 700;" onclick="window.admobManager.showInterstitial()">
                SOLICITAR
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Exibe anúncio de Abertura do App (App Open Ad nativo se disponível)
   */
  async showAppOpenAd() {
    if (this.hasShownAppOpen) return;

    // Apenas no ambiente nativo Capacitor com SDK real
    if (this.isNativePluginAvailable && window.Capacitor?.Plugins?.AdMob) {
      try {
        this.hasShownAppOpen = true;
        const { AdMob } = window.Capacitor.Plugins;
        const unitId = this.config.isTestMode ? this.config.testUnits.appOpen : this.config.units.appOpen;
        await AdMob.prepareAppOpen({ adId: unitId });
        await AdMob.showAppOpen();
      } catch (err) {
        console.warn('[AdMob Native] App Open nativo não carregado:', err);
      }
    }
  }

  /**
   * Exibe anúncio Intersticial de Tela Cheia (ex: ao Finalizar Compra)
   */
  async showInterstitial(onAdClosedCallback) {
    const now = Date.now();
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
      type: 'Anúncio Intersticial • Google AdMob Teste',
      duration: 3,
      headline: '🎉 Compra Finalizada com Sucesso!',
      subtext: 'Parabéns! Você controlou seus gastos com o Compras Plus.',
      onClose: onAdClosedCallback
    });
  }

  /**
   * Constrói overlay de anúncio na Web para simular App Open ou Intersticial
   */
  displayWebOverlayAd({ type, duration = 3, headline, subtext, onClose }) {
    const old = document.getElementById('admob-overlay-screen');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'admob-overlay-screen';
    overlay.className = 'admob-fullscreen-overlay';

    let countdown = duration;

    overlay.innerHTML = `
      <div class="admob-overlay-card" style="max-width: 360px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.35);">
        <div class="admob-overlay-header" style="background: #f8fafc; padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <span class="admob-badge" style="position: static; background: #16a34a; color: #fff; font-size: 0.65rem; font-weight: 800; border-radius: 4px; padding: 0.2rem 0.5rem;">
            ${type || 'Anúncio • Google AdMob'}
          </span>
          <button id="btn-close-overlay-ad" class="btn-ad-close" disabled style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: 8px;">
            Aguarde ${countdown}s...
          </button>
        </div>
        
        <div class="admob-overlay-body" style="padding: 1.5rem 1rem; text-align: center;">
          <div class="admob-ad-preview-box">
            <div style="font-size: 3.2rem; margin-bottom: 0.75rem;">🛍️</div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.4rem;">
              ${headline || 'Compras Plus'}
            </h3>
            <p style="font-size: 0.88rem; color: #475569; margin-bottom: 1.25rem; line-height: 1.4;">
              ${subtext || 'Economize nas compras do mês com orçamentos e listas inteligentes.'}
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.75rem; border-radius: 10px; margin-bottom: 1rem;">
              <div style="color: #166534; font-weight: 700; font-size: 0.82rem; margin-bottom: 0.2rem;">
                ✓ Anúncio Oficial de Demonstração
              </div>
              <div style="color: #15803d; font-size: 0.72rem;">
                Google Mobile Ads SDK • Ativo e Homologado
              </div>
            </div>
            <button type="button" class="btn btn-primary" style="width: 100%; padding: 0.65rem; font-weight: 700;" onclick="document.getElementById('btn-close-overlay-ad').click()">
              CONTINUAR NO APP
            </button>
          </div>
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
          btnClose.textContent = '✕ Fechar Anúncio';
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
