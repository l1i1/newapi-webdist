/**
 * Tokeness 首页注入脚本（增强版）
 * 将 newapi-home/home.html 的内容注入到页面中
 * 
 * 特性：
 * - MutationObserver 防止 React 覆盖
 * - 防抖处理避免快速切换时多次执行
 * - 完整的状态管理和错误处理
 * - SPA 路由监听
 */
(function() {
  'use strict';
  
  // 避免重复初始化
  if (window.__tokenessHomeInjectInitialized) {
    return;
  }
  window.__tokenessHomeInjectInitialized = true;
  
  // ============================================================
  // 状态管理
  // ============================================================
  const state = {
    isInjected: false,
    isProcessing: false,
    observer: null,
    debounceTimer: null,
    retryCount: 0,
    maxRetries: 5,
    retryDelay: 500
  };
  
  // ============================================================
  // CSS 样式内容
  // ============================================================
  const TOKENESS_HOME_STYLE = `
/* Hide original main content (skip wrapper) */
.tokeness-hide-original > *:not(#tokeness-home-wrapper):nth-child(n+3):nth-last-child(n+2) {
  display: none !important;
}

/* Tokeness Home Styles */
.tokeness-home{
  --tokeness-background: var(--background, #f7f6f2);
  --tokeness-foreground: var(--foreground, #151515);
  --tokeness-card: var(--card, #ffffff);
  --tokeness-card-foreground: var(--card-foreground, #151515);
  --tokeness-popover: var(--popover, #ffffff);
  --tokeness-popover-foreground: var(--popover-foreground, #151515);
  --tokeness-primary: #d7192a;
  --tokeness-primary-foreground: #ffffff;
  --tokeness-secondary: var(--secondary, #ededeb);
  --tokeness-secondary-foreground: var(--secondary-foreground, #151515);
  --tokeness-muted: var(--muted, #eeeeeb);
  --tokeness-muted-foreground: var(--muted-foreground, #5a5a56);
  --tokeness-border: var(--border, #d8d6cf);
  --tokeness-ring: #d7192a;
  --tokeness-shadow: none;
  --tokeness-gridline: rgba(21, 21, 21, 0.07);
  --tokeness-rule: #151515;
  --tokeness-surface-tint: linear-gradient(180deg, var(--tokeness-card), var(--tokeness-card));
  max-width:1260px;
  margin:0 auto;
  padding:28px 34px 88px;
  color:var(--tokeness-foreground);
  font-family:inherit;
  color-scheme:light dark;
  background:
    linear-gradient(var(--tokeness-gridline) 1px, transparent 1px) 0 0 / 100% 76px,
    linear-gradient(90deg, var(--tokeness-gridline) 1px, transparent 1px) 0 0 / 96px 100%,
    var(--tokeness-background);
}
:is(.dark, [data-theme="dark"]) .tokeness-home{
  --tokeness-background: var(--background, #0b0f14);
  --tokeness-foreground: var(--foreground, #f5f7fb);
  --tokeness-card: var(--card, #14181d);
  --tokeness-card-foreground: var(--card-foreground, #f5f7fb);
  --tokeness-popover: var(--popover, #14181d);
  --tokeness-popover-foreground: var(--popover-foreground, #f5f7fb);
  --tokeness-secondary: var(--secondary, #1b2028);
  --tokeness-secondary-foreground: var(--secondary-foreground, #eef1f5);
  --tokeness-muted: var(--muted, #1b2028);
  --tokeness-muted-foreground: var(--muted-foreground, #aab3bf);
  --tokeness-border: var(--border, #24303c);
  --tokeness-shadow: none;
  --tokeness-gridline: rgba(255,255,255,0.045);
  --tokeness-rule: #f5f7fb;
  --tokeness-surface-tint: linear-gradient(180deg, rgba(19,22,28,.92), rgba(19,22,28,.92));
}
.tokeness-shell{display:grid;gap:30px}
.tokeness-kicker{color:var(--tokeness-primary);font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.tokeness-top-spacer{height:44px}
.tokeness-hero{
  display:grid;
  grid-template-columns:minmax(0,1.36fr) minmax(350px,.64fr);
  gap:26px;
  align-items:stretch;
}
.tokeness-hero-main,.tokeness-hero-side,.tokeness-panel,.tokeness-card,.tokeness-block,.tokeness-provider-tile,.tokeness-band{
  border:1px solid var(--tokeness-border);
  background:var(--tokeness-surface-tint), var(--tokeness-card);
  color:var(--tokeness-card-foreground);
  border-radius:2px;
  box-shadow:var(--tokeness-shadow);
}
.tokeness-hero-main{
  position:relative;
  overflow:hidden;
  padding:40px 34px 34px;
  border-top:4px solid var(--tokeness-rule);
}
.tokeness-hero-main::before{
  content:"";
  position:absolute;
  inset:0 auto 0 0;
  width:6px;
  background:var(--tokeness-primary);
}
.tokeness-system-mark{display:flex;align-items:center;gap:12px;margin-bottom:22px;color:var(--tokeness-primary);font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
.tokeness-system-mark::after{content:"";height:1px;flex:1;background:var(--tokeness-border)}
.tokeness-hero-title{
  margin:0;
  max-width:12ch;
  font-size:clamp(40px,4.0vw,56px);
  line-height:1.06;
  font-weight:900;
  letter-spacing:0;
  text-wrap:balance;
}
.tokeness-hero-copy{
  margin:18px 0 0;
  max-width:42rem;
  font-size:16px;
  line-height:1.88;
  color:var(--tokeness-muted-foreground);
  text-wrap:pretty;
}
.tokeness-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
.tokeness-btn{
  display:inline-flex;align-items:center;justify-content:center;
  min-height:42px;padding:0 18px;border-radius:2px;
  text-decoration:none;font-weight:800;font-size:14px;
  transition:transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease;
}
.tokeness-btn:hover{transform:translateY(-1px)}
.tokeness-btn:focus-visible{outline:2px solid var(--tokeness-ring);outline-offset:2px}
.tokeness-btn.primary{background:var(--tokeness-primary);color:var(--tokeness-primary-foreground);box-shadow:none}
.tokeness-btn.secondary{background:var(--tokeness-secondary);color:var(--tokeness-secondary-foreground);border:1px solid var(--tokeness-border)}
.tokeness-hero-side{padding:30px 28px 28px;display:grid;gap:20px}
.tokeness-side-title{margin:0;font-size:16px;font-weight:900;display:flex;align-items:center;gap:10px}
.tokeness-side-title::before{content:"";width:18px;height:10px;background:var(--tokeness-primary)}
.tokeness-steps{display:grid;gap:0;border-top:1px solid var(--tokeness-border)}
.tokeness-step{display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;align-items:start;color:var(--tokeness-muted-foreground);font-size:14px;line-height:1.8;padding:20px 0;border-bottom:1px solid var(--tokeness-border)}
.tokeness-step-num{
  width:32px;height:28px;border-radius:2px;
  background:var(--tokeness-primary);color:var(--tokeness-primary-foreground);
  display:inline-flex;align-items:center;justify-content:center;
  font-weight:900;font-size:13px;
}
.tokeness-structure{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:0;
  border:1px solid var(--tokeness-border);
  border-top:4px solid var(--tokeness-rule);
  background:var(--tokeness-card);
}
.tokeness-card{
  border:0;
  border-right:1px solid var(--tokeness-border);
  border-radius:0;
  padding:24px 20px 22px;
  min-height:168px;
  display:grid;
  align-content:start;
  gap:16px;
  position:relative;
  background:transparent;
}
.tokeness-card:last-child{border-right:0}
.tokeness-card::before{content:attr(data-index);display:block;color:var(--tokeness-primary);font-size:12px;font-weight:900;letter-spacing:.08em}
.tokeness-card strong{font-size:15px;font-weight:900;letter-spacing:-0.01em}
.tokeness-card span{color:var(--tokeness-muted-foreground);font-size:13px;line-height:1.72;text-wrap:pretty}
.tokeness-band{
  padding:0;
  display:grid;
  grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);
  gap:0;
  align-items:stretch;
}
.tokeness-band-text{padding:30px 32px;border-right:1px solid var(--tokeness-border)}
.tokeness-band-label{color:var(--tokeness-primary);font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.tokeness-band-title{margin:8px 0 0;font-size:22px;font-weight:900;line-height:1.22;text-wrap:balance}
.tokeness-band-copy{margin:12px 0 0;color:var(--tokeness-muted-foreground);line-height:1.9;text-wrap:pretty}
.tokeness-band-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0}
.tokeness-stat{border:0;border-left:1px solid var(--tokeness-border);border-radius:0;padding:30px 22px;background:transparent;display:grid;align-content:center}
.tokeness-stat b{display:block;font-size:24px;line-height:1;font-weight:900;color:var(--tokeness-foreground)}
.tokeness-stat span{display:block;margin-top:6px;font-size:12px;color:var(--tokeness-muted-foreground);text-transform:uppercase;letter-spacing:.05em}
.tokeness-gridline-row{
  display:flex;
  justify-content:center;
  align-items:center;
  margin:4px 0 0;
}
.tokeness-gridline-row::before,.tokeness-gridline-row::after{display:none}
.tokeness-gridline-row span{font-size:clamp(18px,2vw,24px);font-weight:300;color:var(--tokeness-muted-foreground);text-align:center;line-height:1.3}
.tokeness-supplier{display:grid;gap:20px;padding:34px 28px 32px;background:transparent;border:0}
.tokeness-provider-matrix{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px 16px;max-width:1120px;margin:0 auto;padding:0 16px;background:transparent;border:0}
.tokeness-provider-row{display:contents}
.tokeness-provider-row:last-child{border-bottom:0}
.tokeness-provider-label,.tokeness-provider-count{display:none}
.tokeness-provider-icons{display:contents}
.tokeness-provider-tile{width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;border-radius:0;color:var(--tokeness-foreground)}
.tokeness-provider-tile svg{width:40px;height:40px;display:block}
.tokeness-provider-more{font-size:28px;font-weight:900;line-height:1;color:var(--tokeness-foreground)}
.tokeness-footer{
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:24px;
}
.tokeness-block{padding:28px 28px 26px;display:grid;gap:18px}
.tokeness-block-title{margin:0;font-size:16px;font-weight:900}
.tokeness-list{display:grid;gap:12px}
.tokeness-list-item{display:flex;gap:12px;align-items:flex-start;color:var(--tokeness-muted-foreground);font-size:14px;line-height:1.85;padding:12px 0;border-top:1px solid var(--tokeness-border)}
.tokeness-list-item:first-child{border-top:0;padding-top:0}
.tokeness-list-item i{font-style:normal;min-width:34px;text-align:center;color:var(--tokeness-primary);font-weight:900}
.tokeness-spec-table{display:grid;border:1px solid var(--tokeness-border);background:var(--tokeness-card)}
.tokeness-spec-row{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:16px 0;border-bottom:1px solid var(--tokeness-border)}
.tokeness-spec-row:last-child{border-bottom:0}
.tokeness-spec-row span{color:var(--tokeness-muted-foreground);font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding-left:16px;white-space:nowrap;line-height:1.2;align-self:start}
.tokeness-spec-row strong{font-size:14px;font-weight:700;line-height:1.78;padding-right:16px}
.tokeness-site-footer{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:24px;
  align-items:end;
  padding:24px 0 0;
  border-top:1px solid var(--tokeness-border);
}
.tokeness-site-footer-main{display:grid;gap:12px;min-width:0}
.tokeness-footer-brand{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--tokeness-foreground)}
.tokeness-footer-brand::before{content:"";width:22px;height:10px;background:var(--tokeness-primary)}
.tokeness-footer-copy{margin:0;max-width:48rem;color:var(--tokeness-muted-foreground);font-size:13px;line-height:1.8;text-wrap:pretty}
.tokeness-footer-copyright{margin:0;color:var(--tokeness-muted-foreground);font-size:12px;font-weight:700;letter-spacing:.02em}
.tokeness-footer-nav{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.tokeness-footer-link{color:var(--tokeness-muted-foreground);font-size:13px;font-weight:700;text-decoration:none;transition:color .18s ease}
.tokeness-footer-link:hover{color:var(--tokeness-primary)}
.tokeness-footer-link:focus-visible{outline:2px solid var(--tokeness-ring);outline-offset:3px}
.tokeness-footer-right{display:grid;gap:12px;justify-items:end}
.tokeness-footer-legal{display:flex;gap:14px;flex-wrap:wrap;justify-content:flex-end}
.tokeness-footer-badge{display:inline-flex;align-items:center;justify-content:flex-end}
.tokeness-footer-badge img{width:150px;height:auto;display:block}
@media(max-width:980px){
  .tokeness-hero,.tokeness-band,.tokeness-footer{grid-template-columns:1fr}
  .tokeness-structure{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tokeness-card:nth-child(2){border-right:0}
  .tokeness-card:nth-child(-n+2){border-bottom:1px solid var(--tokeness-border)}
  .tokeness-band-text{border-right:0;border-bottom:1px solid var(--tokeness-border)}
}
@media(max-width:720px){
  .tokeness-home{padding:22px 18px 64px}
  .tokeness-structure{grid-template-columns:1fr}
  .tokeness-card{border-right:0;border-bottom:1px solid var(--tokeness-border)}
  .tokeness-card:last-child{border-bottom:0}
  .tokeness-band-stats{grid-template-columns:1fr}
  .tokeness-provider-matrix{gap:12px 14px}
  .tokeness-spec-row{grid-template-columns:1fr;gap:6px}
  .tokeness-spec-row span{padding-left:16px}
  .tokeness-spec-row strong{padding:0 16px 0 16px}
  .tokeness-site-footer{grid-template-columns:1fr;align-items:start}
  .tokeness-footer-right{justify-items:start}
  .tokeness-footer-legal{justify-content:flex-start}
  .tokeness-footer-badge{justify-content:flex-start}
}
@media(max-width:520px){
  .tokeness-top-spacer{height:24px}
  .tokeness-hero-main{padding:26px 18px 24px}
  .tokeness-hero-title{font-size:32px}
  .tokeness-actions{display:grid}
  .tokeness-btn{width:100%}
  .tokeness-provider-tile{width:40px;height:40px}
  .tokeness-provider-tile svg{width:28px;height:28px}
  .tokeness-provider-more{font-size:24px}
}
`;
  
  // ============================================================
  // HTML 内容
  // ============================================================
  const TOKENESS_HOME_HTML = `
<section class="tokeness-home">
  <div class="tokeness-shell">
    <div class="tokeness-top-spacer" aria-hidden="true"></div>
    <section class="tokeness-hero">
      <div class="tokeness-hero-main">
        <div class="tokeness-system-mark">Route / Control Layer</div>
        <h1 class="tokeness-hero-title">一个入口，所有模型</h1>
        <p class="tokeness-hero-copy">
          一个 Key 调所有模型。密钥、额度、路由规则都归 Tokeness 管，请求走哪条路、花了多少钱，直接看后台就行。
        </p>
        <div class="tokeness-actions">
          <a class="tokeness-btn primary" href="/dashboard">进入控制台</a>
          <a class="tokeness-btn secondary" href="/pricing">查看模型广场</a>
        </div>
      </div>
      <aside class="tokeness-hero-side">
        <p class="tokeness-side-title">接入流程</p>
        <div class="tokeness-steps">
          <div class="tokeness-step"><span class="tokeness-step-num">1</span><span>建 Key，设好能用哪些模型、额度上限多少。</span></div>
          <div class="tokeness-step"><span class="tokeness-step-num">2</span><span>配路由，哪个优先、什么时候切备用。</span></div>
          <div class="tokeness-step"><span class="tokeness-step-num">3</span><span>Key 丢进代码里，OpenAI 协议通用，SDK 不用动。</span></div>
        </div>
      </aside>
    </section>
    <section class="tokeness-structure">
      <div class="tokeness-card" data-index="A01"><strong>一个 Key 调所有</strong><span>换模型不用换 Key，省心。</span></div>
      <div class="tokeness-card" data-index="A02"><strong>额度管得住</strong><span>按项目分开，花多少剩多少，超了自动停。</span></div>
      <div class="tokeness-card" data-index="A03"><strong>稳定中转</strong><span>开发测试生产一条线走，不卡不断。</span></div>
      <div class="tokeness-card" data-index="A04"><strong>消费看得清</strong><span>哪个 Key 在烧钱、哪个模型卡了，实时看。</span></div>
    </section>
    <section class="tokeness-band">
      <div class="tokeness-band-text">
        <div class="tokeness-band-label">System Layer</div>
        <h2 class="tokeness-band-title">请求到模型，每一步都有记录</h2>
        <p class="tokeness-band-copy">
          请求进来，先查 Key 权限和额度，再按路由规则选模型，返回结果。整个过程全留痕，谁调的、花了多少、切了哪个模型，都能查到。
        </p>
      </div>
      <div class="tokeness-band-stats">
        <div class="tokeness-stat"><b>30+</b><span>providers</span></div>
        <div class="tokeness-stat"><b>1</b><span>gateway</span></div>
        <div class="tokeness-stat"><b>3</b><span>layers</span></div>
      </div>
    </section>
    <section class="tokeness-block tokeness-supplier">
      <div class="tokeness-gridline-row"><span>30+ 供应商已接入，OpenAI / Claude / Gemini / DeepSeek / Qwen 都有</span></div>
      <div class="tokeness-provider-matrix">
        <div class="tokeness-provider-tile tokeness-provider-more">30+</div>
      </div>
    </section>
    <section class="tokeness-footer">
      <div class="tokeness-block">
        <p class="tokeness-block-title">路由与控制</p>
        <div class="tokeness-list">
          <div class="tokeness-list-item"><i>01</i><span>一个项目一个 Key，模型和额度都限定好，超了直接拦。</span></div>
          <div class="tokeness-list-item"><i>02</i><span>先验 Key、再查额度、匹配路由、发送。挂了自动重试或切备用。</span></div>
          <div class="tokeness-list-item"><i>03</i><span>开发测试生产各走各的路，互相不影响。</span></div>
        </div>
      </div>
      <div class="tokeness-block">
        <p class="tokeness-block-title">适配与输出</p>
        <div class="tokeness-spec-table">
          <div class="tokeness-spec-row"><span>SDK</span><strong>OpenAI / Claude / Gemini / Qwen</strong></div>
          <div class="tokeness-spec-row"><span>Routing</span><strong>按项目、模型、稳定性自动选路。</strong></div>
          <div class="tokeness-spec-row"><span>Output</span><strong>返回格式兼容 OpenAI，代码不用改。</strong></div>
          <div class="tokeness-spec-row"><span>Audit</span><strong>谁调的、花了多少、切没切备用，都能查。</strong></div>
        </div>
      </div>
    </section>
    <footer class="tokeness-site-footer">
      <div class="tokeness-site-footer-main">
        <div class="tokeness-footer-brand">Tokeness</div>
        <p class="tokeness-footer-copy">
          Tokeness，一个 Key 接所有模型，接入快，账目清。
        </p>
        <p class="tokeness-footer-copyright">© 2026 Tokeness. All rights reserved.</p>
        <nav class="tokeness-footer-nav" aria-label="Tokeness footer navigation">
          <a class="tokeness-footer-link" href="/pricing">模型广场</a>
          <a class="tokeness-footer-link" href="mailto:contact@tokeness.io">联系我们</a>
        </nav>
      </div>
      <div class="tokeness-footer-right">
        <a class="tokeness-footer-badge" href="https://lmspeed.net/provider/tokeness-cn" target="_blank" rel="noopener">
          <img src="https://lmspeed.net/api/provider/claim-badge/1278?claim=1278--EDVRn1QWCO5Q_Feyad9cpuqsjUZVIb3" alt="Verified on LM Speed">
        </a>
        <nav class="tokeness-footer-legal" aria-label="Legal links">
          <a class="tokeness-footer-link" href="/privacy-policy">隐私政策</a>
          <a class="tokeness-footer-link" href="/user-agreement">用户协议</a>
        </nav>
      </div>
    </footer>
  </div>
</section>
`;
  
  // ============================================================
  // 工具函数
  // ============================================================
  
  // 日志函数
  function log(msg, type = 'info') {
    const prefix = '[Tokeness]';
    const styles = {
      info: 'color: #d7192a; font-weight: bold;',
      warn: 'color: #ff9800; font-weight: bold;',
      error: 'color: #f44336; font-weight: bold;',
      success: 'color: #4caf50; font-weight: bold;'
    };
    console.log(`%c${prefix} ${msg}`, styles[type] || styles.info);
  }
  
  // 防抖函数
  function debounce(fn, delay) {
    return function(...args) {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  
  // 延迟执行
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================================
  // 核心功能
  // ============================================================
  
  // 注入样式
  function injectStyles() {
    try {
      if (document.getElementById('tokeness-home-style')) {
        log('Styles already injected, skipping');
        return;
      }
      
      const styleEl = document.createElement('style');
      styleEl.id = 'tokeness-home-style';
      styleEl.textContent = TOKENESS_HOME_STYLE;
      document.head.appendChild(styleEl);
      log('Styles injected', 'success');
    } catch (err) {
      log(`Failed to inject styles: ${err.message}`, 'error');
    }
  }
  
  // 检查是否是首页
  function isHomePage() {
    const path = window.location.pathname;
    return path === '/' || path === '/index' || path === '/index.html';
  }
  
  // 查找主容器
  function findMainContainer() {
    return document.querySelector('.bg-background.text-foreground');
  }
  
  // 注入内容
  function doInject() {
    try {
      const mainContainer = findMainContainer();
      if (!mainContainer) {
        log('Main container not found, will retry', 'warn');
        return false;
      }
      
      // 检查是否已经注入
      if (document.getElementById('tokeness-home-wrapper') && 
          mainContainer.classList.contains('tokeness-hide-original')) {
        log('Already injected, skipping');
        state.isInjected = true;
        return true;
      }
      
      // 添加隐藏类
      mainContainer.classList.add('tokeness-hide-original');
      
      // 创建或获取 wrapper
      let wrapper = document.getElementById('tokeness-home-wrapper');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'tokeness-home-wrapper';
        // 插入到 header 之后（第 3 个子元素位置）
        const headerAfter = mainContainer.children[2];
        mainContainer.insertBefore(wrapper, headerAfter || null);
      }
      
      // 注入内容
      wrapper.innerHTML = TOKENESS_HOME_HTML;
      state.isInjected = true;
      
      log('Content injected successfully', 'success');
      return true;
    } catch (err) {
      log(`Failed to inject content: ${err.message}`, 'error');
      return false;
    }
  }
  
  // 带重试的注入
  async function injectWithRetry() {
    if (state.isProcessing) {
      log('Already processing, skipping');
      return;
    }
    
    state.isProcessing = true;
    state.retryCount = 0;
    
    while (state.retryCount < state.maxRetries) {
      if (doInject()) {
        break;
      }
      
      state.retryCount++;
      log(`Retry ${state.retryCount}/${state.maxRetries}...`, 'warn');
      await delay(state.retryDelay);
    }
    
    if (!state.isInjected) {
      log('Failed to inject after max retries', 'error');
    }
    
    state.isProcessing = false;
  }
  
  // 清理注入
  function cleanup() {
    try {
      // 移除 wrapper
      const wrapper = document.getElementById('tokeness-home-wrapper');
      if (wrapper) {
        wrapper.remove();
        log('Wrapper removed');
      }
      
      // 移除隐藏类
      const mainContainer = findMainContainer();
      if (mainContainer) {
        mainContainer.classList.remove('tokeness-hide-original');
        log('Hide class removed');
      }
      
      // 停止观察器
      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }
      
      state.isInjected = false;
      log('Cleanup completed', 'success');
    } catch (err) {
      log(`Cleanup failed: ${err.message}`, 'error');
    }
  }
  
  // ============================================================
  // MutationObserver - 防止 React 覆盖
  // ============================================================
  
  function startObserver() {
    if (state.observer) {
      state.observer.disconnect();
    }
    
    const targetNode = document.body;
    if (!targetNode) return;
    
    const config = { childList: true, subtree: true };
    
    state.observer = new MutationObserver((mutations) => {
      if (!isHomePage() || !state.isInjected) return;
      
      // 检查 wrapper 是否被移除
      const wrapper = document.getElementById('tokeness-home-wrapper');
      if (!wrapper) {
        log('Wrapper removed by React, re-injecting', 'warn');
        doInject();
        return;
      }
      
      // 检查隐藏类是否被移除
      const mainContainer = findMainContainer();
      if (mainContainer && !mainContainer.classList.contains('tokeness-hide-original')) {
        log('Hide class removed by React, re-adding', 'warn');
        mainContainer.classList.add('tokeness-hide-original');
      }
    });
    
    state.observer.observe(targetNode, config);
    log('MutationObserver started');
  }
  
  // ============================================================
  // 路由监听
  // ============================================================
  
  function handleRouteChange() {
    const debouncedHandler = debounce(() => {
      log(`Route changed to: ${window.location.pathname}`);
      
      if (isHomePage()) {
        injectWithRetry().then(() => {
          if (state.isInjected) {
            startObserver();
          }
        });
      } else {
        cleanup();
      }
    }, 150);
    
    debouncedHandler();
  }
  
  function watchRouteChanges() {
    // popstate（浏览器前进/后退）
    window.addEventListener('popstate', handleRouteChange);
    
    // pushState/replaceState（React Router）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      handleRouteChange();
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      handleRouteChange();
    };
    
    // hashchange
    window.addEventListener('hashchange', handleRouteChange);
    
    log('Route watchers initialized');
  }
  
  // ============================================================
  // 初始化
  // ============================================================
  
  async function init() {
    log('Initializing...');
    
    // 注入样式
    injectStyles();
    
    // 如果是首页，注入内容
    if (isHomePage()) {
      await injectWithRetry();
      if (state.isInjected) {
        startObserver();
      }
    }
    
    // 启动路由监听
    watchRouteChanges();
    
    log('Initialized successfully', 'success');
  }
  
  // 等待 DOM 就绪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
