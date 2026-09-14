import page from 'page';
import { signIn, signUp, resetPassword } from '../services/authService.js';

export const LoginView = {
  render() {
    // Esconde o shell autenticado
    const shell = document.getElementById('main-app-shell');
    if (shell) shell.classList.add('hidden');

    const app = document.getElementById('app');
    let loginView = document.getElementById('view-login-inicial');
    if (!loginView) {
      loginView = document.createElement('div');
      loginView.id = 'view-login-inicial';
      loginView.className = 'auth-initial-page flex flex-col relative w-full flex-1 bg-surface px-margin py-space-lg min-h-screen';
      app.appendChild(loginView);
      loginView.innerHTML = `
      <div class="flex flex-col w-full pb-margin">
        <div class="flex flex-col items-center text-center pt-space-xs pb-space-lg">
          <div class="relative mb-space-md flex items-center justify-center">
            <div class="absolute -inset-2 bg-primary-fixed/20 rounded-full blur-xl pointer-events-none"></div>
            <img alt="Compras Plus Logo" class="h-20 w-20 rounded-2xl object-cover relative z-10 shadow-lg ring-2 ring-emerald-500/20" src="/icons/icon-512.png"/>
          </div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm mb-space-sm shadow-sm">
            <span class="material-symbols-outlined text-[16px]">verified</span>
            <span>Controle Financeiro Inteligente</span>
          </div>
          <h1 class="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight">
            Bem-vindo!
          </h1>
          <p class="font-body-md text-body-md text-on-surface-variant max-w-[280px] mt-1 leading-relaxed">
            Acesse suas listas, gastos e economia inteligente
          </p>
        </div>

        <!-- Seletor de Abas Tailwind -->
        <div class="flex items-center bg-surface-container-low rounded-xl p-1 mb-6 shadow-sm auth-initial-tabs">
          <button type="button" class="flex-1 h-10 rounded-lg font-label-md text-label-md transition-all text-on-surface-variant hover:text-on-surface auth-tab-choice active" id="btn-tab-choice-login">
            🔑 Entrar
          </button>
          <button type="button" class="flex-1 h-10 rounded-lg font-label-md text-label-md transition-all text-on-surface-variant hover:text-on-surface auth-tab-choice" id="btn-tab-choice-signup">
            ✨ Criar Conta
          </button>
        </div>

        <div id="auth-initial-alert" class="auth-alert hidden bg-error-container text-on-error-container p-3 rounded-lg mb-4 text-sm font-medium"></div>

        <div class="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-md">
          
          <!-- Formulário: ENTRAR -->
          <form id="form-initial-login" class="auth-form-block flex flex-col gap-space-md">
            <div class="flex flex-col gap-1.5 form-group-mobile">
              <label class="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" for="initial-login-email">
                <span>E-mail</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant/70 font-normal">Principal</span>
              </label>
              <div class="flex items-center bg-surface-container-low rounded-xl focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_2px_#006948] transition-all h-[52px]">
                <div class="w-12 h-full flex items-center justify-center text-outline shrink-0">
                  <span class="material-symbols-outlined text-[20px] transition-colors">mail</span>
                </div>
                <input class="w-full h-full pr-4 bg-transparent outline-none text-on-surface font-body-md text-body-md placeholder:text-outline" id="initial-login-email" type="email" placeholder="seu.email@exemplo.com" required autocomplete="email"/>
              </div>
            </div>

            <div class="flex flex-col gap-1.5 form-group-mobile">
              <div class="flex items-center justify-between">
                <label class="font-label-md text-label-md text-on-surface font-semibold" for="initial-login-password">Senha</label>
                <button type="button" class="font-label-md text-label-md text-primary hover:text-primary-container active:opacity-75 transition-colors link-forgot-pass" id="btn-initial-forgot-pass">
                  Esqueceu a senha?
                </button>
              </div>
              <div class="relative flex items-center bg-surface-container-low rounded-xl focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_2px_#006948] transition-all h-[52px] password-input-wrapper">
                <div class="w-12 h-full flex items-center justify-center text-outline shrink-0">
                  <span class="material-symbols-outlined text-[20px] transition-colors">lock</span>
                </div>
                <input class="w-full h-full pr-12 bg-transparent outline-none text-on-surface font-body-md text-body-md placeholder:text-outline" id="initial-login-password" type="password" placeholder="••••••••••••" required autocomplete="current-password"/>
                <button type="button" aria-label="Alternar visibilidade da senha" class="absolute right-3.5 p-1.5 text-outline hover:text-on-surface rounded-lg active:scale-95 transition-all flex items-center justify-center btn-toggle-password" data-target="initial-login-password">
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1 auth-remember-row">
              <label class="flex items-center gap-2.5 cursor-pointer select-none group checkbox-remember-label">
                <div class="relative flex items-center">
                  <input type="checkbox" id="initial-login-remember" checked class="sr-only peer"/>
                  <div class="w-5 h-5 rounded-lg bg-surface-container-high peer-checked:bg-primary transition-all flex items-center justify-center shadow-inner group-active:scale-95">
                    <span class="material-symbols-outlined text-white text-[16px] opacity-0 peer-checked:opacity-100 transition-opacity transform scale-75 peer-checked:scale-100 duration-150">check</span>
                  </div>
                </div>
                <span class="font-label-md text-label-md text-on-surface-variant font-medium">Lembrar de mim</span>
              </label>
              <span class="inline-flex items-center gap-1 font-body-sm text-body-sm text-secondary font-medium">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> Conexão Segura
              </span>
            </div>

            <button type="submit" id="btn-initial-login-submit" class="btn-auth-submit w-full h-[52px] mt-space-xs bg-primary text-on-primary rounded-xl font-label-lg text-label-lg shadow-md hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <span>Entrar no Compras Plus</span>
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>

          <!-- Formulário: CRIAR CONTA -->
          <form id="form-initial-signup" class="auth-form-block hidden flex flex-col gap-space-md">
            <!-- VIP Trial Incentive Pill -->
            <div class="bg-secondary-container/30 px-space-md py-space-sm rounded-2xl flex items-center gap-space-sm shadow-sm mb-2">
              <div class="w-7 h-7 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0 shadow-sm">
                <span class="material-symbols-outlined text-on-secondary-fixed text-[18px]" style="font-variation-settings: 'FILL' 1;">stars</span>
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-label-sm text-label-sm text-on-secondary-container tracking-wider uppercase">Vantagem Exclusiva</span>
                  <span class="inline-flex w-1.5 h-1.5 rounded-full bg-secondary"></span>
                </div>
                <p class="font-label-md text-label-md text-on-surface font-semibold truncate">30 dias grátis de VIP liberados</p>
              </div>
            </div>

            <!-- Full Name Input -->
            <div class="flex flex-col gap-1.5">
              <label class="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" for="initial-signup-name">
                <span>Nome completo</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant font-normal">Obrigatório</span>
              </label>
              <div class="relative flex items-center bg-surface-container-lowest rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-20 transition-all">
                <div class="w-12 h-12 flex items-center justify-center text-outline">
                  <span class="material-symbols-outlined text-[20px]">person</span>
                </div>
                <input class="w-full h-12 pr-4 bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-outline/60" id="initial-signup-name" type="text" placeholder="Ex.: Ana Silva" required autocomplete="name"/>
              </div>
            </div>

            <!-- Email Input -->
            <div class="flex flex-col gap-1.5">
              <label class="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" for="initial-signup-email">
                <span>E-mail</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant font-normal">Obrigatório</span>
              </label>
              <div class="relative flex items-center bg-surface-container-lowest rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-20 transition-all">
                <div class="w-12 h-12 flex items-center justify-center text-outline">
                  <span class="material-symbols-outlined text-[20px]">mail</span>
                </div>
                <input class="w-full h-12 pr-4 bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-outline/60" id="initial-signup-email" type="email" placeholder="seu.email@exemplo.com" required autocomplete="email"/>
              </div>
            </div>

            <!-- Phone / WhatsApp Input -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label class="font-label-md text-label-md text-on-surface font-semibold" for="initial-signup-phone">WhatsApp / Celular</label>
                <span class="font-body-sm text-body-sm text-primary font-medium bg-primary-fixed/30 px-2 py-0.5 rounded-full">Alertas</span>
              </div>
              <div class="relative flex items-center bg-surface-container-lowest rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-20 transition-all">
                <div class="flex items-center gap-1 pl-3 pr-2 py-2 text-on-surface">
                  <span class="text-base select-none">🇧🇷</span>
                  <span class="font-label-sm text-label-sm font-bold text-on-surface-variant">+55</span>
                  <div class="w-px h-5 bg-outline-variant/50 ml-1.5"></div>
                </div>
                <input class="w-full h-12 pl-2 pr-4 bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-outline/60" id="initial-signup-phone" type="tel" maxlength="15" placeholder="(11) 98765-4321" required autocomplete="tel" />
              </div>
            </div>

            <!-- Password Input -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label class="font-label-md text-label-md text-on-surface font-semibold" for="initial-signup-password">Senha de acesso</label>
                <span class="font-label-sm text-label-sm text-outline font-semibold" id="strength-label">Digite a senha</span>
              </div>
              <div class="relative flex items-center bg-surface-container-lowest rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-20 transition-all">
                <div class="w-12 h-12 flex items-center justify-center text-outline">
                  <span class="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <input class="w-full h-12 pr-12 bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-outline/60" id="initial-signup-password" type="password" placeholder="Mínimo 8 caracteres" required minlength="8" autocomplete="new-password" />
                <button aria-label="Alternar visualização da senha" class="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-outline hover:text-on-surface btn-toggle-password" data-target="initial-signup-password" type="button">
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
              <div class="grid grid-cols-4 gap-1.5 mt-1">
                <div class="h-1.5 rounded-full bg-surface-container-highest transition-colors duration-200" id="bar-1"></div>
                <div class="h-1.5 rounded-full bg-surface-container-highest transition-colors duration-200" id="bar-2"></div>
                <div class="h-1.5 rounded-full bg-surface-container-highest transition-colors duration-200" id="bar-3"></div>
                <div class="h-1.5 rounded-full bg-surface-container-highest transition-colors duration-200" id="bar-4"></div>
              </div>
              <div class="flex flex-wrap items-center gap-x-space-md gap-y-1 mt-1.5 pt-1">
                <div class="flex items-center gap-1 text-outline transition-colors" id="req-length">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  <span class="font-body-sm text-body-sm">8+ caracteres</span>
                </div>
                <div class="flex items-center gap-1 text-outline transition-colors" id="req-number">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  <span class="font-body-sm text-body-sm">Número/Símbolo</span>
                </div>
                <div class="flex items-center gap-1 text-outline transition-colors" id="req-case">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  <span class="font-body-sm text-body-sm">Letra maiúscula</span>
                </div>
              </div>
            </div>

            <!-- Confirm Password Input -->
            <div class="flex flex-col gap-1.5" id="initial-signup-confirm-wrapper">
              <label class="font-label-md text-label-md text-on-surface font-semibold" for="initial-signup-confirm-password">Confirmar senha</label>
              <div class="relative flex items-center bg-surface-container-lowest rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-20 transition-all">
                <div class="w-12 h-12 flex items-center justify-center text-outline">
                  <span class="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <input class="w-full h-12 pr-12 bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-outline/60" id="initial-signup-confirm-password" type="password" placeholder="Repita sua senha" required autocomplete="new-password" />
                <button aria-label="Alternar visualização da confirmação de senha" class="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-outline hover:text-on-surface btn-toggle-password" data-target="initial-signup-confirm-password" type="button">
                  <span class="material-symbols-outlined text-[20px]">visibility</span>
                </button>
              </div>
              <span class="font-body-sm text-body-sm text-error hidden flex items-center gap-1 pt-0.5" id="match-hint">
                <span class="material-symbols-outlined text-[14px]">error</span> As senhas não coincidem.
              </span>
            </div>

            <!-- Friendly Consent Checkboxes -->
            <div class="flex flex-col gap-space-sm pt-space-xs">
              <label class="flex items-start gap-space-sm cursor-pointer select-none group">
                <div class="relative flex items-center justify-center mt-0.5">
                  <input class="peer sr-only" id="terms-checkbox" required type="checkbox"/>
                  <div class="w-6 h-6 rounded-lg bg-surface-container-highest peer-checked:bg-primary transition-all flex items-center justify-center group-hover:bg-surface-container-high">
                    <span class="material-symbols-outlined text-on-primary text-[18px] opacity-0 peer-checked:opacity-100 font-bold scale-75 peer-checked:scale-100 transition-all">check</span>
                  </div>
                </div>
                <span class="font-body-md text-body-md text-on-surface-variant leading-tight">
                  Li e concordo com os <a class="text-primary font-semibold hover:underline" href="#/termos">Termos de Uso</a> e <a class="text-primary font-semibold hover:underline" href="#/termos">Política de Privacidade</a>.
                </span>
              </label>

              <label class="flex items-start gap-space-sm cursor-pointer select-none group">
                <div class="relative flex items-center justify-center mt-0.5">
                  <input checked class="peer sr-only" id="initial-signup-marketing" type="checkbox"/>
                  <div class="w-6 h-6 rounded-lg bg-surface-container-highest peer-checked:bg-primary transition-all flex items-center justify-center group-hover:bg-surface-container-high">
                    <span class="material-symbols-outlined text-on-primary text-[18px] opacity-0 peer-checked:opacity-100 font-bold scale-75 peer-checked:scale-100 transition-all">check</span>
                  </div>
                </div>
                <span class="font-body-md text-body-md text-on-surface-variant leading-tight">
                  Quero receber alertas de promoções e resumos de economia.
                </span>
              </label>
            </div>

            <button type="submit" id="btn-initial-signup-submit" class="mt-space-sm w-full h-14 bg-primary hover:bg-primary-container text-on-primary rounded-2xl font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all active:scale-[0.98]">
              <span>Criar minha conta</span>
              <span class="material-symbols-outlined text-[22px]">arrow_forward</span>
            </button>
          </form>

          <!-- Formulário: RECUPERAÇÃO DE SENHA -->
          <div id="block-initial-recovery" class="auth-form-block hidden flex flex-col w-full max-w-md mx-auto">
            <div class="flex items-center justify-between py-space-xs mb-4">
              <button aria-label="Voltar para a tela anterior" class="w-10 h-10 -ml-1 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-surface-container transition-all active:scale-95" type="button" id="btn-initial-back-to-login-icon">
                <span class="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div class="flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container-low">
                <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Acesso Seguro</span>
              </div>
            </div>

            <div class="flex flex-col items-center text-center mb-space-lg">
              <div class="relative flex items-center justify-center mb-space-md">
                <div class="w-20 h-20 rounded-3xl bg-primary-fixed flex items-center justify-center shadow-md transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                  <span class="material-symbols-outlined text-on-primary-fixed text-[36px]" style="font-variation-settings: 'FILL' 1;">lock_reset</span>
                </div>
                <div class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shadow-sm border-2 border-surface">
                  <span class="material-symbols-outlined text-on-secondary-container text-[18px]">verified_user</span>
                </div>
              </div>
              <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-space-xs font-bold">Esqueceu sua senha?</h2>
              <p class="font-body-md text-body-md text-on-surface-variant max-w-xs leading-relaxed">
                Sem problemas! Informe seu canal preferido e enviaremos um código de validação imediato.
              </p>
            </div>

            <div class="bg-surface-container-lowest rounded-3xl p-space-md shadow-sm mb-space-md flex flex-col gap-space-md">
              <div class="grid grid-cols-2 p-1 rounded-2xl bg-surface-container-low gap-1" role="tablist">
                <button aria-selected="true" class="flex items-center justify-center gap-1.5 py-2.5 px-space-sm rounded-xl font-label-md text-label-md transition-all duration-200 bg-surface-container-lowest text-primary shadow-sm" id="tab-email" role="tab" type="button">
                  <span class="material-symbols-outlined text-[18px]">mail</span>
                  <span>Por E-mail</span>
                </button>
                <button aria-selected="false" class="flex items-center justify-center gap-1.5 py-2.5 px-space-sm rounded-xl font-label-md text-label-md transition-all duration-200 text-on-surface-variant hover:text-on-surface" id="tab-phone" role="tab" type="button">
                  <span class="material-symbols-outlined text-[18px]">chat</span>
                  <span>WhatsApp / SMS</span>
                </button>
              </div>

              <form class="flex flex-col gap-space-md" id="recovery-form">
                <div class="flex flex-col gap-1.5" id="email-field-group">
                  <label class="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between" for="initial-recovery-email">
                    <span>E-mail cadastrado</span>
                    <span class="text-primary font-body-sm text-body-sm">Ex: nome@exemplo.com</span>
                  </label>
                  <div class="relative flex items-center">
                    <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">alternate_email</span>
                    <input class="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline/70" id="initial-recovery-email" placeholder="seuemail@comprasplus.com.br" required type="email"/>
                  </div>
                </div>

                <div class="hidden flex-col gap-1.5" id="phone-field-group">
                  <label class="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between" for="recovery-phone">
                    <span>Número com DDD</span>
                    <span class="text-secondary font-body-sm text-body-sm">WhatsApp instantâneo</span>
                  </label>
                  <div class="relative flex items-center">
                    <span class="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">phone_iphone</span>
                    <input class="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline/70" id="recovery-phone" placeholder="(11) 98765-4321" type="tel"/>
                  </div>
                </div>

                <div class="flex items-start gap-space-sm p-space-sm rounded-xl bg-surface-container-low text-on-surface-variant">
                  <span class="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5" style="font-variation-settings: 'FILL' 1;">info</span>
                  <p class="font-body-sm text-body-sm leading-snug">
                    O link ou código enviado terá <strong class="text-on-surface font-semibold">validade de 15 minutos</strong> para garantir a segurança dos seus dados orçamentários.
                  </p>
                </div>

                <button class="w-full h-13 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all duration-200 active:scale-[0.98] py-3 mt-2" id="btn-initial-send-recovery" type="button">
                  <span>Enviar código de recuperação</span>
                  <span class="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>
            </div>

            <div class="bg-surface-container-lowest rounded-3xl p-space-md shadow-sm mb-space-lg transition-all duration-300 hidden" id="success-card">
              <div class="flex items-center gap-3 mb-space-sm">
                <div class="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-on-primary-fixed-variant text-[20px]">pin</span>
                </div>
                <div>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface">Próximos passos</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">Como funciona a recuperação segura</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 pt-space-xs">
                <div class="flex flex-col items-center text-center p-2 rounded-xl bg-surface-container-low">
                  <span class="w-6 h-6 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm flex items-center justify-center mb-1">1</span>
                  <span class="font-label-sm text-label-sm text-on-surface font-semibold">Receba</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-tight mt-0.5">Código de 6 dígitos</span>
                </div>
                <div class="flex flex-col items-center text-center p-2 rounded-xl bg-surface-container-low">
                  <span class="w-6 h-6 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm flex items-center justify-center mb-1">2</span>
                  <span class="font-label-sm text-label-sm text-on-surface font-semibold">Digite</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-tight mt-0.5">Na tela seguinte</span>
                </div>
                <div class="flex flex-col items-center text-center p-2 rounded-xl bg-surface-container-low">
                  <span class="w-6 h-6 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm flex items-center justify-center mb-1">3</span>
                  <span class="font-label-sm text-label-sm text-on-surface font-semibold">Pronto</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-tight mt-0.5">Defina nova senha</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-center justify-center gap-1 text-center mt-4">
              <p class="font-body-md text-body-md text-on-surface-variant">Lembrou sua senha?</p>
              <button type="button" id="btn-initial-back-to-login" class="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary hover:text-primary-container font-semibold transition-colors py-1 px-3 rounded-lg hover:bg-surface-container-low">
                <span class="material-symbols-outlined text-[18px]">lock_open</span>
                <span>Voltar ao Login</span>
              </button>
            </div>
          </div>

          <!-- Atalho: Modo Visitante / Offline -->
          <div class="pt-4 mt-2 border-t border-outline-variant/30 flex flex-col items-center">
            <button type="button" id="btn-login-guest" class="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-primary/5 active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[18px]">account_circle</span>
              <span>Continuar como Visitante (Modo Offline)</span>
            </button>
          </div>
        </div>

        <div class="mt-space-lg mb-space-sm text-center flex flex-col items-center gap-2 auth-initial-footer">
          <div class="flex items-center gap-2 text-outline text-body-sm font-body-sm">
            <span class="material-symbols-outlined text-[14px]">lock</span>
            <span>Privacidade protegida com criptografia</span>
          </div>
        </div>
      </div>
    </div>

    `;
    }
    loginView.classList.remove('hidden');
    this.attachEvents();
  },

  showAuthAlert(msg, type = 'error') {
    const alertEl = document.getElementById('auth-initial-alert');
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `auth-alert bg-${type}-container text-on-${type}-container p-3 rounded-lg mb-4 text-sm font-medium`;
    alertEl.classList.remove('hidden');
  },

  hideAuthAlert() {
    const alertEl = document.getElementById('auth-initial-alert');
    if (alertEl) alertEl.classList.add('hidden');
  },

  attachEvents() {
    document.getElementById('btn-login-guest')?.addEventListener('click', () => {
      appStore.state.currentUser = {
        id: 'guest',
        email: 'visitante@comprasplus.app',
        user_metadata: { name: 'Visitante' }
      };
      localStorage.setItem('compras_plus_guest', 'true');
      page('/dashboard');
    });

    const loginForm = document.getElementById('form-initial-login');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.hideAuthAlert();
        
        const email = document.getElementById('initial-login-email').value;
        const password = document.getElementById('initial-login-password').value;
        const btn = document.getElementById('btn-initial-login-submit');
        const originalText = btn.innerHTML;
        
        try {
          btn.disabled = true;
          btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span><span>Entrando...</span>';
          
          await signIn(email, password);
          page('/dashboard');
        } catch (error) {
          this.showAuthAlert(error.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }

    const signupForm = document.getElementById('form-initial-signup');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.hideAuthAlert();
        
        const name = document.getElementById('initial-signup-name').value;
        const email = document.getElementById('initial-signup-email').value;
        const phone = document.getElementById('initial-signup-phone').value;
        const password = document.getElementById('initial-signup-password').value;
        const marketing = document.getElementById('initial-signup-marketing').checked;
        const btn = document.getElementById('btn-initial-signup-submit');
        
        const originalText = btn.innerHTML;
        
        try {
          btn.disabled = true;
          btn.innerHTML = '<span class="material-symbols-outlined text-[22px] animate-spin">progress_activity</span><span>Criando conta...</span>';
          
          await signUp(email, password, name, phone, marketing);
          page('/dashboard');
        } catch (error) {
          this.showAuthAlert(error.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      });
    }

    // Toggle forms
    const btnTabLogin = document.getElementById('btn-tab-choice-login');
    const btnTabSignup = document.getElementById('btn-tab-choice-signup');
    const formLogin = document.getElementById('form-initial-login');
    const formSignup = document.getElementById('form-initial-signup');
    const blockRecovery = document.getElementById('block-initial-recovery');

    if (btnTabLogin && btnTabSignup) {
      btnTabLogin.addEventListener('click', () => {
        btnTabLogin.classList.add('active', 'text-on-surface');
        btnTabLogin.classList.remove('text-on-surface-variant');
        btnTabSignup.classList.remove('active', 'text-on-surface');
        btnTabSignup.classList.add('text-on-surface-variant');
        
        formLogin.classList.remove('hidden');
        formSignup.classList.add('hidden');
        blockRecovery.classList.add('hidden');
        this.hideAuthAlert();
      });

      btnTabSignup.addEventListener('click', () => {
        btnTabSignup.classList.add('active', 'text-on-surface');
        btnTabSignup.classList.remove('text-on-surface-variant');
        btnTabLogin.classList.remove('active', 'text-on-surface');
        btnTabLogin.classList.add('text-on-surface-variant');
        
        formSignup.classList.remove('hidden');
        formLogin.classList.add('hidden');
        blockRecovery.classList.add('hidden');
        this.hideAuthAlert();
      });
    }

    // Recovery View toggle
    const btnForgotPass = document.getElementById('btn-initial-forgot-pass');
    const btnBackToLogin = document.getElementById('btn-initial-back-to-login');
    const btnBackToLoginIcon = document.getElementById('btn-initial-back-to-login-icon');

    const showRecovery = () => {
      formLogin.classList.add('hidden');
      formSignup.classList.add('hidden');
      blockRecovery.classList.remove('hidden');
      this.hideAuthAlert();
    };

    const hideRecovery = () => {
      btnTabLogin.click();
    };

    if (btnForgotPass) btnForgotPass.addEventListener('click', showRecovery);
    if (btnBackToLogin) btnBackToLogin.addEventListener('click', hideRecovery);
    if (btnBackToLoginIcon) btnBackToLoginIcon.addEventListener('click', hideRecovery);
    const signupPhone = document.getElementById('initial-signup-phone');
    if (signupPhone) {
      signupPhone.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 6) {
          e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        } else if (value.length > 2) {
          e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        } else if (value.length > 0) {
          e.target.value = `(${value}`;
        } else {
          e.target.value = '';
        }
      });
    }

    const signupPassword = document.getElementById('initial-signup-password');
    if (signupPassword) {
      signupPassword.addEventListener('input', (e) => {
        this.checkPasswordStrength(e.target.value);
      });
    }

    const signupConfirmPassword = document.getElementById('initial-signup-confirm-password');
    if (signupConfirmPassword) {
      signupConfirmPassword.addEventListener('input', () => {
        this.validateMatch();
      });
    }

    // Tabs functionality
    const tabEmail = document.getElementById('tab-email');
    const tabPhone = document.getElementById('tab-phone');
    const emailGroup = document.getElementById('email-field-group');
    const phoneGroup = document.getElementById('phone-field-group');
    const emailInput = document.getElementById('initial-recovery-email');
    const phoneInput = document.getElementById('recovery-phone');

    if (tabEmail && tabPhone) {
      tabEmail.addEventListener('click', () => {
        tabEmail.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        tabEmail.classList.remove('text-on-surface-variant');
        tabEmail.setAttribute('aria-selected', 'true');
        tabPhone.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        tabPhone.classList.add('text-on-surface-variant');
        tabPhone.setAttribute('aria-selected', 'false');
        emailGroup.classList.remove('hidden');
        emailGroup.classList.add('flex');
        phoneGroup.classList.add('hidden');
        phoneGroup.classList.remove('flex');
        emailInput.setAttribute('required', 'true');
        phoneInput.removeAttribute('required');
        emailInput.focus();
      });

      // Passwords visibility toggle
      document.querySelectorAll('.btn-toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetId = btn.getAttribute('data-target');
          const input = document.getElementById(targetId);
          if (!input) return;
          
          const icon = btn.querySelector('span');
          if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility_off';
          } else {
            input.type = 'password';
            icon.textContent = 'visibility';
          }
        });
      });

      tabPhone.addEventListener('click', () => {
        tabPhone.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        tabPhone.classList.remove('text-on-surface-variant');
        tabPhone.setAttribute('aria-selected', 'true');
        tabEmail.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        tabEmail.classList.add('text-on-surface-variant');
        tabEmail.setAttribute('aria-selected', 'false');
        phoneGroup.classList.remove('hidden');
        phoneGroup.classList.add('flex');
        emailGroup.classList.add('hidden');
        emailGroup.classList.remove('flex');
        phoneInput.setAttribute('required', 'true');
        emailInput.removeAttribute('required');
        phoneInput.focus();
      });
    }
  },

  checkPasswordStrength(val) {
    let score = 0;
    const reqLength = document.getElementById('req-length');
    const reqNumber = document.getElementById('req-number');
    const reqCase = document.getElementById('req-case');
    const label = document.getElementById('strength-label');

    const b1 = document.getElementById('bar-1');
    const b2 = document.getElementById('bar-2');
    const b3 = document.getElementById('bar-3');
    const b4 = document.getElementById('bar-4');
    
    if (!reqLength) return;

    const hasMinLen = val.length >= 8;
    const hasNumOrSym = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);
    const hasUpper = /[A-Z]/.test(val);

    this.updateReq(reqLength, hasMinLen);
    this.updateReq(reqNumber, hasNumOrSym);
    this.updateReq(reqCase, hasUpper);

    if (val.length > 0) score++;
    if (hasMinLen) score++;
    if (hasNumOrSym) score++;
    if (hasUpper && val.length >= 10) score++;

    [b1, b2, b3, b4].forEach(b => {
      if(b) b.className = 'h-1.5 rounded-full bg-surface-container-highest transition-colors duration-200';
    });

    if (val.length === 0) {
      label.textContent = 'Digite a senha';
      label.className = 'font-label-sm text-label-sm text-outline font-semibold';
      return;
    }

    if (score <= 1) {
      b1.classList.remove('bg-surface-container-highest');
      b1.classList.add('bg-error');
      label.textContent = 'Muito fraca';
      label.className = 'font-label-sm text-label-sm text-error font-semibold';
    } else if (score === 2) {
      b1.classList.remove('bg-surface-container-highest');
      b2.classList.remove('bg-surface-container-highest');
      b1.classList.add('bg-error');
      b2.classList.add('bg-error');
      label.textContent = 'Fraca';
      label.className = 'font-label-sm text-label-sm text-error font-semibold';
    } else if (score === 3) {
      b1.classList.remove('bg-surface-container-highest');
      b2.classList.remove('bg-surface-container-highest');
      b3.classList.remove('bg-surface-container-highest');
      b1.classList.add('bg-secondary');
      b2.classList.add('bg-secondary');
      b3.classList.add('bg-secondary');
      label.textContent = 'Média';
      label.className = 'font-label-sm text-label-sm text-secondary font-semibold';
    } else {
      [b1, b2, b3, b4].forEach(b => {
        b.classList.remove('bg-surface-container-highest');
        b.classList.add('bg-primary');
      });
      label.textContent = 'Forte e segura 🎉';
      label.className = 'font-label-sm text-label-sm text-primary font-semibold';
    }

    this.validateMatch();
  },

  updateReq(el, active) {
    if (active) {
      el.classList.remove('text-outline');
      el.classList.add('text-primary');
      el.querySelector('span').textContent = 'check_circle';
    } else {
      el.classList.add('text-outline');
      el.classList.remove('text-primary');
      el.querySelector('span').textContent = 'radio_button_unchecked';
    }
  },

  validateMatch() {
    const p1El = document.getElementById('initial-signup-password');
    const p2El = document.getElementById('initial-signup-confirm-password');
    const hint = document.getElementById('match-hint');
    if(!p1El || !p2El || !hint) return;
    
    const p1 = p1El.value;
    const p2 = p2El.value;

    if (p2.length > 0 && p1 !== p2) {
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
    }
  }
};
