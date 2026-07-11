"use strict";
(function () {
    "use strict";
    if (window.__tokenessHomeInjectInitialized)
        return;
    window.__tokenessHomeInjectInitialized = true;
    const state = {
        isInjected: false,
        isProcessing: false,
        observer: null,
        debounceTimer: null,
        retryCount: 0,
        maxRetries: 5,
        retryDelay: 500,
        apiWatcherStarted: false,
        languageWatcherStarted: false,
        headWatcherStarted: false,
        paymentDialogWatcherStarted: false,
        isLocalizingHead: false,
        headObserver: null,
        languageObserver: null,
        languageRefreshTimer: null
    };
    const DEFAULT_CNY_RATE = 7;
    const WALLET_COPY = {
        zh: {
            referralTitle: "推荐计划",
            referralCopy: "通过邀请链接注册的新用户，首次充值将立返您充值金额的20%，自动到账。",
            referralStats: {
                pending: "待确认",
                totalIncome: "总收入",
                invites: "邀请"
            },
            epayNotice: "付款过后不要关闭页面，需等待自动跳转回本站，以避免延迟到账"
        },
        en: {
            referralTitle: "Referral Program",
            referralCopy: "New users who register through your invite link will give you 20% of their first top-up back automatically.",
            referralStats: {
                pending: "Pending",
                totalIncome: "Total Earned",
                invites: "Invites"
            },
            epayNotice: "Do not close this page after payment. Wait until it redirects back automatically to avoid delayed crediting."
        },
        fr: {
            referralTitle: "Programme de parrainage",
            referralCopy: "Les nouveaux utilisateurs inscrits via votre lien vous reversent automatiquement 20% de leur première recharge.",
            referralStats: {
                pending: "En attente",
                totalIncome: "Total gagné",
                invites: "Invitations"
            },
            epayNotice: "Ne fermez pas cette page après le paiement. Attendez la redirection automatique pour éviter tout retard de crédit."
        }
    };
    const REFERRAL_TITLES = [
        WALLET_COPY.zh.referralTitle,
        WALLET_COPY.en.referralTitle,
        WALLET_COPY.fr.referralTitle,
        "Реферальная программа",
        "紹介プログラム",
        "Chương trình Giới thiệu"
    ];
    const REFERRAL_STAT_LABEL_GROUPS = [
        [WALLET_COPY.zh.referralStats.pending, WALLET_COPY.en.referralStats.pending, WALLET_COPY.fr.referralStats.pending, "Ожидает", "保留中", "Đang chờ"],
        [WALLET_COPY.zh.referralStats.totalIncome, WALLET_COPY.en.referralStats.totalIncome, WALLET_COPY.fr.referralStats.totalIncome, "Total Income", "Всего заработано", "総収益"],
        [WALLET_COPY.zh.referralStats.invites, WALLET_COPY.en.referralStats.invites, WALLET_COPY.fr.referralStats.invites, "Invite", "Invitation", "Приглашения"]
    ];
    const REFERRAL_HIDDEN_STAT_LABELS = [
        WALLET_COPY.zh.referralStats.pending,
        WALLET_COPY.zh.referralStats.totalIncome,
        WALLET_COPY.en.referralStats.pending,
        WALLET_COPY.en.referralStats.totalIncome,
        "Total Income",
        WALLET_COPY.fr.referralStats.pending,
        WALLET_COPY.fr.referralStats.totalIncome,
        "Ожидает",
        "Всего заработано",
        "保留中",
        "総収益",
        "Đang chờ",
        "Total income"
    ];
    const TRANSFER_TO_BALANCE_LABELS = ["转移到余额", "Transfer to Balance", "Transférer vers le solde", "Перевести на баланс", "残高への振替", "Chuyển vào số dư"];
    const PAYMENT_DIALOG_TITLE_LABELS = ["确认付款", "Confirm Payment", "Confirmer le paiement", "Подтвердить оплату", "支払いの確認", "Xác nhận Thanh toán"];
    const PAYMENT_DIALOG_PAY_LABELS = ["您支付", "You Pay", "Vous payez", "Вы платите", "お支払い額", "Bạn thanh toán"];
    const PAYMENT_DIALOG_METHOD_LABELS = ["付款方式", "Payment Method", "Méthode de paiement", "Способ оплаты", "チャージ方法", "Phương thức thanh toán"];
    const PAYMENT_DIALOG_RECHARGE_AMOUNT_LABELS = ["充值金额", "Recharge Amount", "Montant de la recharge", "Сумма пополнения", "チャージ額", "Số tiền nạp"];
    // i18n translations
    const translations = {
        zh: {
            heroKicker: "Route / Control Layer",
            heroTitle: "一个入口，所有模型",
            heroCopy: "一个 Key 调所有模型。密钥、额度、路由规则都归 Tokeness 管，请求走哪条路、花了多少钱，直接看后台就行。",
            btnDashboard: "进入控制台",
            btnPricing: "查看模型广场",
            stepsTitle: "接入流程",
            step1: "建 Key，设好能用哪些模型、额度上限多少。",
            step2: "配路由，哪个优先、什么时候切备用。",
            step3: "Key 丢进代码里，OpenAI 协议通用，SDK 不用动。",
            cardA01Title: "一个 Key 调所有",
            cardA01Desc: "换模型不用换 Key，省心。",
            cardA02Title: "额度管得住",
            cardA02Desc: "按项目分开，花多少剩多少，超了自动停。",
            cardA03Title: "稳定中转",
            cardA03Desc: "开发测试生产一条线走，不卡不断。",
            cardA04Title: "消费看得清",
            cardA04Desc: "哪个 Key 在烧钱、哪个模型卡了，实时看。",
            bandLabel: "System Layer",
            bandTitle: "请求到模型，每一步都有记录",
            bandCopy: "请求进来，先查 Key 权限和额度，再按路由规则选模型，返回结果。整个过程全留痕，谁调的、花了多少、切了哪个模型，都能查到。",
            supplierLabel: "30+ 供应商已接入，OpenAI / Claude / Gemini / DeepSeek / Qwen 都有",
            footerRouteTitle: "路由与控制",
            footerRoute01: "一个项目一个 Key，模型和额度都限定好，超了直接拦。",
            footerRoute02: "先验 Key、再查额度、匹配路由、发送。挂了自动重试或切备用。",
            footerRoute03: "开发测试生产各走各的路，互相不影响。",
            footerAdaptTitle: "适配与输出",
            footerAdaptRouting: "按项目、模型、稳定性自动选路。",
            footerAdaptOutput: "返回格式兼容 OpenAI，代码不用改。",
            footerAdaptAudit: "谁调的、花了多少、切没切备用，都能查。",
            footerCopy: "Tokeness，一个 Key 接所有模型，接入快，账目清。",
            footerModels: "模型广场",
            footerContact: "联系我们",
            footerPrivacy: "隐私政策",
            footerTerms: "用户协议"
        },
        en: {
            heroKicker: "Route / Control Layer",
            heroTitle: "One Entry, All Models",
            heroCopy: "One Key for all models. Keys, quotas, routing rules \u2014 all managed by Tokeness. See which path your requests took and how much they cost, right in the dashboard.",
            btnDashboard: "Go to Dashboard",
            btnPricing: "View Model Marketplace",
            stepsTitle: "Integration Steps",
            step1: "Create a Key, set which models it can use and the quota limit.",
            step2: "Configure routing \u2014 which path is primary, when to switch to backup.",
            step3: "Drop the Key into your code \u2014 OpenAI-compatible protocol, no SDK changes needed.",
            cardA01Title: "One Key for All",
            cardA01Desc: "Switch models without changing keys. Simple.",
            cardA02Title: "Quota Control",
            cardA02Desc: "Per-project budgets \u2014 see spending vs remaining, auto-stop on overage.",
            cardA03Title: "Stable Relay",
            cardA03Desc: "Dev, test, production \u2014 one pipeline, no interruptions.",
            cardA04Title: "Transparent Usage",
            cardA04Desc: "See which Key is burning tokens, which model is slow \u2014 in real time.",
            bandLabel: "System Layer",
            bandTitle: "Every Request, Fully Traced",
            bandCopy: "Requests come in \u2014 Key permissions and quotas are checked first, then routing rules select a model and return the result. The entire process is logged: who called, how much was spent, which model was used \u2014 all traceable.",
            supplierLabel: "30+ Providers Connected \u2014 OpenAI / Claude / Gemini / DeepSeek / Qwen and more",
            footerRouteTitle: "Routing & Control",
            footerRoute01: "One Key per project \u2014 models and quotas locked in, overage blocked automatically.",
            footerRoute02: "Key validation \u2192 quota check \u2192 route matching \u2192 send. Auto-retry or failover on errors.",
            footerRoute03: "Dev, test, and production run on separate paths \u2014 no cross-interference.",
            footerAdaptTitle: "Compatibility & Output",
            footerAdaptRouting: "Auto-route by project, model, and stability.",
            footerAdaptOutput: "OpenAI-compatible output format \u2014 no code changes needed.",
            footerAdaptAudit: "Full audit trail: caller, cost, failover events \u2014 all queryable.",
            footerCopy: "Tokeness \u2014 one Key for all models. Fast integration, clear billing.",
            footerModels: "Model Marketplace",
            footerContact: "Contact Us",
            footerPrivacy: "Privacy Policy",
            footerTerms: "Terms of Service"
        },
        fr: {
            heroKicker: "Route / Control Layer",
            heroTitle: "Une entree, tous les modeles",
            heroCopy: "Une seule cle pour tous les modeles. Tokeness gere les cles, les quotas et les regles de routage. Consultez dans le tableau de bord le chemin pris par chaque requete et son cout.",
            btnDashboard: "Ouvrir le tableau de bord",
            btnPricing: "Voir la place de marche des modeles",
            stepsTitle: "Etapes d'integration",
            step1: "Creez une cle, puis definissez les modeles autorises et la limite de quota.",
            step2: "Configurez le routage: chemin prioritaire et bascule de secours.",
            step3: "Ajoutez la cle dans votre code: protocole compatible OpenAI, sans changer de SDK.",
            cardA01Title: "Une cle pour tout",
            cardA01Desc: "Changez de modele sans changer de cle.",
            cardA02Title: "Quotas maitrises",
            cardA02Desc: "Budgets par projet, arret automatique en cas de depassement.",
            cardA03Title: "Relais stable",
            cardA03Desc: "Developpement, test et production sur une meme voie fiable.",
            cardA04Title: "Usage transparent",
            cardA04Desc: "Suivez les cles, les couts et les latences en temps reel.",
            bandLabel: "System Layer",
            bandTitle: "Chaque requete est tracee de bout en bout",
            bandCopy: "La requete arrive, les droits et le quota de la cle sont verifies, puis les regles de routage choisissent le modele et renvoient la reponse. Appelant, cout et bascule restent auditables.",
            supplierLabel: "30+ fournisseurs connectes: OpenAI / Claude / Gemini / DeepSeek / Qwen et plus",
            footerRouteTitle: "Routage et controle",
            footerRoute01: "Une cle par projet, avec modeles et quotas verrouilles.",
            footerRoute02: "Validation de cle, controle du quota, routage, envoi. Reessai ou secours en cas d'erreur.",
            footerRoute03: "Developpement, test et production restent separes.",
            footerAdaptTitle: "Compatibilite et sortie",
            footerAdaptRouting: "Routage automatique par projet, modele et stabilite.",
            footerAdaptOutput: "Format compatible OpenAI, sans modifier le code.",
            footerAdaptAudit: "Appelant, cout et bascule sont consultables.",
            footerCopy: "Tokeness, une cle pour tous les modeles. Integration rapide, facturation claire.",
            footerModels: "Place de marche des modeles",
            footerContact: "Nous contacter",
            footerPrivacy: "Politique de confidentialite",
            footerTerms: "Conditions d'utilisation"
        },
        ru: {
            heroKicker: "Route / Control Layer",
            heroTitle: "One Entry, All Models",
            heroCopy: "One Key for all models. Keys, quotas, routing rules are managed by Tokeness. See each request path and cost in the dashboard.",
            btnDashboard: "Go to Dashboard",
            btnPricing: "View Model Marketplace",
            stepsTitle: "Integration Steps",
            step1: "Create a Key and set allowed models and quota limits.",
            step2: "Configure routing: primary path and failover rules.",
            step3: "Use the Key in your code with the OpenAI-compatible protocol.",
            cardA01Title: "One Key for All",
            cardA01Desc: "Switch models without changing keys.",
            cardA02Title: "Quota Control",
            cardA02Desc: "Per-project budgets with automatic overage blocking.",
            cardA03Title: "Stable Relay",
            cardA03Desc: "One reliable path for dev, test, and production.",
            cardA04Title: "Transparent Usage",
            cardA04Desc: "Track keys, costs, and model issues in real time.",
            bandLabel: "System Layer",
            bandTitle: "Every request is fully traced",
            bandCopy: "Tokeness checks key permissions and quota, applies routing rules, selects a model, and returns the response. Caller, cost, and failover events remain auditable.",
            supplierLabel: "30+ providers connected: OpenAI / Claude / Gemini / DeepSeek / Qwen and more",
            footerRouteTitle: "Routing & Control",
            footerRoute01: "One Key per project with locked models and quotas.",
            footerRoute02: "Key validation, quota check, route matching, send. Auto-retry or failover on errors.",
            footerRoute03: "Dev, test, and production stay separated.",
            footerAdaptTitle: "Compatibility & Output",
            footerAdaptRouting: "Auto-route by project, model, and stability.",
            footerAdaptOutput: "OpenAI-compatible output format with no code changes.",
            footerAdaptAudit: "Caller, cost, and failover events are queryable.",
            footerCopy: "Tokeness: one Key for all models. Fast integration, clear billing.",
            footerModels: "Model Marketplace",
            footerContact: "Contact Us",
            footerPrivacy: "Privacy Policy",
            footerTerms: "Terms of Service"
        },
        ja: {
            heroKicker: "Route / Control Layer",
            heroTitle: "One Entry, All Models",
            heroCopy: "One Key for all models. Keys, quotas, routing rules are managed by Tokeness. See each request path and cost in the dashboard.",
            btnDashboard: "Go to Dashboard",
            btnPricing: "View Model Marketplace",
            stepsTitle: "Integration Steps",
            step1: "Create a Key and set allowed models and quota limits.",
            step2: "Configure routing: primary path and failover rules.",
            step3: "Use the Key in your code with the OpenAI-compatible protocol.",
            cardA01Title: "One Key for All",
            cardA01Desc: "Switch models without changing keys.",
            cardA02Title: "Quota Control",
            cardA02Desc: "Per-project budgets with automatic overage blocking.",
            cardA03Title: "Stable Relay",
            cardA03Desc: "One reliable path for dev, test, and production.",
            cardA04Title: "Transparent Usage",
            cardA04Desc: "Track keys, costs, and model issues in real time.",
            bandLabel: "System Layer",
            bandTitle: "Every request is fully traced",
            bandCopy: "Tokeness checks key permissions and quota, applies routing rules, selects a model, and returns the response. Caller, cost, and failover events remain auditable.",
            supplierLabel: "30+ providers connected: OpenAI / Claude / Gemini / DeepSeek / Qwen and more",
            footerRouteTitle: "Routing & Control",
            footerRoute01: "One Key per project with locked models and quotas.",
            footerRoute02: "Key validation, quota check, route matching, send. Auto-retry or failover on errors.",
            footerRoute03: "Dev, test, and production stay separated.",
            footerAdaptTitle: "Compatibility & Output",
            footerAdaptRouting: "Auto-route by project, model, and stability.",
            footerAdaptOutput: "OpenAI-compatible output format with no code changes.",
            footerAdaptAudit: "Caller, cost, and failover events are queryable.",
            footerCopy: "Tokeness: one Key for all models. Fast integration, clear billing.",
            footerModels: "Model Marketplace",
            footerContact: "Contact Us",
            footerPrivacy: "Privacy Policy",
            footerTerms: "Terms of Service"
        },
        vi: {
            heroKicker: "Route / Control Layer",
            heroTitle: "One Entry, All Models",
            heroCopy: "One Key for all models. Keys, quotas, routing rules are managed by Tokeness. See each request path and cost in the dashboard.",
            btnDashboard: "Go to Dashboard",
            btnPricing: "View Model Marketplace",
            stepsTitle: "Integration Steps",
            step1: "Create a Key and set allowed models and quota limits.",
            step2: "Configure routing: primary path and failover rules.",
            step3: "Use the Key in your code with the OpenAI-compatible protocol.",
            cardA01Title: "One Key for All",
            cardA01Desc: "Switch models without changing keys.",
            cardA02Title: "Quota Control",
            cardA02Desc: "Per-project budgets with automatic overage blocking.",
            cardA03Title: "Stable Relay",
            cardA03Desc: "One reliable path for dev, test, and production.",
            cardA04Title: "Transparent Usage",
            cardA04Desc: "Track keys, costs, and model issues in real time.",
            bandLabel: "System Layer",
            bandTitle: "Every request is fully traced",
            bandCopy: "Tokeness checks key permissions and quota, applies routing rules, selects a model, and returns the response. Caller, cost, and failover events remain auditable.",
            supplierLabel: "30+ providers connected: OpenAI / Claude / Gemini / DeepSeek / Qwen and more",
            footerRouteTitle: "Routing & Control",
            footerRoute01: "One Key per project with locked models and quotas.",
            footerRoute02: "Key validation, quota check, route matching, send. Auto-retry or failover on errors.",
            footerRoute03: "Dev, test, and production stay separated.",
            footerAdaptTitle: "Compatibility & Output",
            footerAdaptRouting: "Auto-route by project, model, and stability.",
            footerAdaptOutput: "OpenAI-compatible output format with no code changes.",
            footerAdaptAudit: "Caller, cost, and failover events are queryable.",
            footerCopy: "Tokeness: one Key for all models. Fast integration, clear billing.",
            footerModels: "Model Marketplace",
            footerContact: "Contact Us",
            footerPrivacy: "Privacy Policy",
            footerTerms: "Terms of Service"
        }
    };
    const headTranslations = {
        zh: {
            title: "Tokeness - 一个入口，所有模型 | AI API",
            metaTitle: "Tokeness - 一个入口，所有模型 | AI API",
            metaDescription: "Tokeness 提供一个入口接入所有主流 AI 模型。一个 Key 连通 GPT、Claude、DeepSeek 等模型，兼容 OpenAI 接口，支持额度控制、路由管理、消费审计和隐私中转，开发接入更简单。",
            metaKeywords: "AI API Gateway, API 中转站, LLM API, 全模型AI接口, GPT API, Claude API, OpenAI兼容API, AI接口中转, Tokeness, AI API Hub"
        },
        en: {
            title: "Tokeness - One Entry, All Models | AI API",
            metaTitle: "Tokeness - One Entry, All Models | AI API",
            metaDescription: "Tokeness gives developers one entry to every major AI model. Use one OpenAI-compatible key for GPT, Claude, DeepSeek and more, with quota control, routing management, usage audit and privacy-preserving relay.",
            metaKeywords: "AI API Gateway, LLM API, GPT API, Claude API, OpenAI compatible API, AI API proxy, Tokeness, AI API Hub"
        },
        fr: {
            title: "Tokeness - Une entree, tous les modeles | AI API",
            metaTitle: "Tokeness - Une entree, tous les modeles | AI API",
            metaDescription: "Tokeness offre aux developpeurs une entree unique vers tous les grands modeles IA. Une seule cle compatible OpenAI donne acces a GPT, Claude, DeepSeek et plus, avec controle des quotas, routage, audit d'usage et relais respectueux de la confidentialite.",
            metaKeywords: "AI API Gateway, API IA, LLM API, GPT API, Claude API, API compatible OpenAI, Tokeness"
        },
        ru: {
            title: "Tokeness - Один вход, все модели | AI API",
            metaTitle: "Tokeness - Один вход, все модели | AI API",
            metaDescription: "Tokeness дает разработчикам один вход ко всем основным AI-моделям. Один OpenAI-совместимый ключ подключает GPT, Claude, DeepSeek и другие модели с контролем квот, управлением маршрутизацией, аудитом расходов и приватным транзитом данных.",
            metaKeywords: "AI API Gateway, LLM API, GPT API, Claude API, OpenAI compatible API, Tokeness"
        },
        ja: {
            title: "Tokeness - 一つの入口、すべてのモデル | AI API",
            metaTitle: "Tokeness - 一つの入口、すべてのモデル | AI API",
            metaDescription: "Tokeness は開発者向けに、主要な AI モデルへ接続する一つの入口を提供します。OpenAI 互換の一つの Key で GPT、Claude、DeepSeek などを利用でき、クォータ管理、ルーティング、利用監査、プライバシーを守る中継に対応します。",
            metaKeywords: "AI API Gateway, LLM API, GPT API, Claude API, OpenAI compatible API, Tokeness"
        },
        vi: {
            title: "Tokeness - Mot loi vao, tat ca mo hinh | AI API",
            metaTitle: "Tokeness - Mot loi vao, tat ca mo hinh | AI API",
            metaDescription: "Tokeness cho nha phat trien mot loi vao den tat ca mo hinh AI pho bien. Mot key tuong thich OpenAI ket noi GPT, Claude, DeepSeek va nhieu mo hinh khac, kem quan ly quota, dieu phoi tuyen, kiem toan su dung va relay bao ve rieng tu.",
            metaKeywords: "AI API Gateway, LLM API, GPT API, Claude API, OpenAI compatible API, Tokeness"
        }
    };
    const SUPPORTED_LANGUAGES = ["zh", "en", "fr", "ru", "ja", "vi"];
    const localizedTextSources = new WeakMap();
    const localizedStringSources = new Map();
    const MAX_LOCALIZED_STRING_SOURCES = 500;
    const MAX_LOCALIZE_TREE_DEPTH = 80;
    let currentLang = getNewApiLanguage();
    function normalizeLanguage(value) {
        return readSupportedLanguage(value) || "en";
    }
    function readRenderedLanguage() {
        const text = document.body ? document.body.textContent || "" : "";
        if (!text)
            return null;
        if (text.includes("控制台") || text.includes("模型广场") || text.includes("推荐计划") || text.includes("系统公告"))
            return "zh";
        if (text.includes("Console") || text.includes("Model Square") || text.includes("Referral Program") || text.includes("System Announcements"))
            return "en";
        return null;
    }
    function readSupportedLanguage(value) {
        if (!value)
            return null;
        const normalized = String(value).trim().replace(/_/g, "-").toLowerCase();
        if (normalized.startsWith("zh"))
            return "zh";
        const language = normalized.split("-")[0];
        return SUPPORTED_LANGUAGES.includes(language) ? language : null;
    }
    function getNewApiLanguage() {
        try {
            return readSupportedLanguage(localStorage.getItem("i18nextLng"))
                || readSupportedLanguage(document.documentElement.lang)
                || readRenderedLanguage()
                || normalizeLanguage(navigator.language);
        }
        catch (err) {
            return readSupportedLanguage(document.documentElement.lang)
                || readRenderedLanguage()
                || normalizeLanguage(navigator.language);
        }
    }
    function t(key) { return (translations[currentLang] || translations.en)[key] || translations.en[key] || key; }
    function ht(key) { return (headTranslations[currentLang] || headTranslations.en)[key] || headTranslations.en[key] || ""; }
    function walletCopy() {
        if (currentLang === "zh")
            return WALLET_COPY.zh;
        if (currentLang === "fr")
            return WALLET_COPY.fr;
        return WALLET_COPY.en;
    }
    function upsertNamedMeta(name, content) {
        if (!document.head || !content)
            return;
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta && document.readyState !== "loading") {
            meta = document.createElement("meta");
            meta.setAttribute("name", name);
            document.head.appendChild(meta);
        }
        if (meta && meta.getAttribute("content") !== content)
            meta.setAttribute("content", content);
    }
    function updatePropertyMeta(property, content) {
        if (!document.head || !content)
            return;
        const meta = document.querySelector(`meta[property="${property}"]`);
        if (meta && meta.getAttribute("content") !== content)
            meta.setAttribute("content", content);
    }
    function applyLocalizedHeadContent() {
        if (!document.head || state.isLocalizingHead)
            return;
        state.isLocalizingHead = true;
        try {
            const title = ht("title");
            const description = ht("metaDescription");
            if (title && document.title !== title)
                document.title = title;
            upsertNamedMeta("title", ht("metaTitle"));
            upsertNamedMeta("description", description);
            upsertNamedMeta("keywords", ht("metaKeywords"));
            updatePropertyMeta("og:title", title);
            updatePropertyMeta("og:description", description);
            updatePropertyMeta("twitter:title", title);
            updatePropertyMeta("twitter:description", description);
        }
        finally {
            state.isLocalizingHead = false;
        }
    }
    function watchHeadContent() {
        if (state.headWatcherStarted || !document.head)
            return;
        state.headWatcherStarted = true;
        state.headObserver = new MutationObserver(() => {
            if (!state.isLocalizingHead)
                setTimeout(applyLocalizedHeadContent, 0);
        });
        state.headObserver.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["content"] });
    }
    function refreshLanguage() {
        const nextLang = getNewApiLanguage();
        if (nextLang === currentLang) {
            applyLocalizedHeadContent();
            localizeMultilingualContent(document.body);
            enhanceRechargePage();
            enhancePaymentDialog();
            enhanceReferralPlan();
            return;
        }
        currentLang = nextLang;
        applyLocalizedHeadContent();
        const wrapper = document.getElementById("tokeness-home-wrapper");
        if (wrapper) {
            wrapper.innerHTML = getTokenessHomeHTML();
            renderNotice();
        }
        localizeMultilingualContent(document.body);
        enhanceRechargePage();
        enhancePaymentDialog();
        enhanceReferralPlan();
    }
    function scheduleLanguageRefresh() {
        if (state.languageRefreshTimer)
            clearTimeout(state.languageRefreshTimer);
        state.languageRefreshTimer = setTimeout(() => {
            state.languageRefreshTimer = null;
            refreshLanguage();
        }, 50);
    }
    function pickLocalizedValue(value) {
        if (!value || typeof value !== "object" || Array.isArray(value))
            return null;
        return value[currentLang] || value[normalizeLanguage(currentLang)] || value.en || value.zh || null;
    }
    function decodeXmlEntities(value) {
        return String(value)
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, "&");
    }
    function unwrapCdata(value) {
        const match = String(value).match(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/);
        return match ? match[1] : value;
    }
    function readTokenessTextValues(text) {
        const values = {};
        const pattern = /<tokeness-text\b([^>]*)>([\s\S]*?)<\/tokeness-text>/gi;
        let match = pattern.exec(String(text));
        while (match) {
            const langMatch = match[1].match(/\blang\s*=\s*["']?([^"'\s>]+)["']?/i);
            if (langMatch) {
                values[normalizeLanguage(langMatch[1])] = decodeXmlEntities(unwrapCdata(match[2])).trim();
            }
            match = pattern.exec(String(text));
        }
        return values;
    }
    function rememberLocalizedStringSource(value, sourceText) {
        if (!localizedStringSources.has(value) && localizedStringSources.size >= MAX_LOCALIZED_STRING_SOURCES) {
            const oldestKey = localizedStringSources.keys().next().value;
            if (typeof oldestKey === "string")
                localizedStringSources.delete(oldestKey);
        }
        localizedStringSources.set(value, sourceText);
    }
    function localizeTokenessTextGroups(text) {
        const sourceText = String(text);
        const pattern = /<tokeness-text\b([^>]*)>([\s\S]*?)<\/tokeness-text>/gi;
        const languages = new Set();
        let output = "";
        let cursor = 0;
        let groupStart = -1;
        let groupEnd = -1;
        let foundGroup = false;
        const flushGroup = () => {
            if (groupStart < 0)
                return;
            const groupSource = sourceText.slice(groupStart, groupEnd);
            const localized = pickLocalizedValue(readTokenessTextValues(groupSource));
            output += sourceText.slice(cursor, groupStart);
            output += typeof localized === "string" ? localized : groupSource;
            cursor = groupEnd;
            groupStart = -1;
            groupEnd = -1;
            languages.clear();
        };
        let match = pattern.exec(sourceText);
        while (match) {
            const langMatch = match[1].match(/\blang\s*=\s*["']?([^"'\s>]+)["']?/i);
            const language = langMatch ? readSupportedLanguage(langMatch[1]) : null;
            if (!language) {
                flushGroup();
                match = pattern.exec(sourceText);
                continue;
            }
            const gap = groupEnd >= 0 ? sourceText.slice(groupEnd, match.index) : "";
            if (groupStart >= 0 && (gap.trim() || languages.has(language)))
                flushGroup();
            if (groupStart < 0)
                groupStart = match.index;
            groupEnd = pattern.lastIndex;
            languages.add(language);
            foundGroup = true;
            match = pattern.exec(sourceText);
        }
        flushGroup();
        output += sourceText.slice(cursor);
        return foundGroup ? output : null;
    }
    function parseLocalizedXmlText(text) {
        if (!text)
            return null;
        const localized = localizeTokenessTextGroups(text);
        if (typeof localized !== "string")
            return null;
        rememberLocalizedStringSource(localized.trim(), text);
        return localized;
    }
    function parseLocalizedText(text) {
        const trimmed = text.trim();
        if (!trimmed)
            return null;
        const xmlValue = parseLocalizedXmlText(trimmed);
        if (typeof xmlValue === "string")
            return xmlValue;
        if (trimmed[0] !== "{")
            return null;
        try {
            const parsed = JSON.parse(trimmed);
            return pickLocalizedValue(parsed);
        }
        catch (err) {
            return null;
        }
    }
    function isLocalizedObject(value) {
        if (!value || typeof value !== "object" || Array.isArray(value))
            return false;
        const keys = Object.keys(value);
        return keys.length > 0
            && keys.every((key) => readSupportedLanguage(key))
            && Object.values(value).every((childValue) => typeof childValue === "string");
    }
    function localizeValue(value) {
        if (!value)
            return value;
        if (isLocalizedObject(value))
            return pickLocalizedValue(value) || value;
        if (typeof value === "string")
            return parseLocalizedText(localizedStringSources.get(value.trim()) || value) || value;
        return value;
    }
    function localizeTree(value, depth = 0) {
        const localized = localizeValue(value);
        if (localized !== value)
            return localized;
        if (depth >= MAX_LOCALIZE_TREE_DEPTH)
            return value;
        if (Array.isArray(value))
            return value.map((childValue) => localizeTree(childValue, depth + 1));
        if (!value || typeof value !== "object")
            return value;
        const nextValue = {};
        for (const [key, childValue] of Object.entries(value)) {
            nextValue[key] = localizeTree(childValue, depth + 1);
        }
        return nextValue;
    }
    function isLocalizableApiUrl(url) {
        if (!url || isSystemSettingsPage())
            return false;
        try {
            const parsed = new URL(url, window.location.origin);
            return parsed.pathname.startsWith("/api/");
        }
        catch (err) {
            return String(url).includes("/api/");
        }
    }
    function isSystemSettingsPage() {
        const path = window.location.pathname;
        return path === "/system-settings" || path.startsWith("/system-settings/");
    }
    function localizeApiPayload(url, payload) {
        return localizeTree(payload);
    }
    function localizeApiResponseText(url, text) {
        if (!isLocalizableApiUrl(url) || !text)
            return text;
        try {
            return JSON.stringify(localizeApiPayload(url, JSON.parse(text)));
        }
        catch (err) {
            return text;
        }
    }
    function getFetchRequestUrl(input) {
        if (typeof input === "string")
            return input;
        if (typeof URL === "function" && input instanceof URL)
            return input.href;
        if (input && typeof input === "object" && typeof input.url === "string")
            return input.url;
        return input ? String(input) : "";
    }
    function resetLocalizedXhrResponse(xhr) {
        xhr.__tokenessApiLocalized = false;
        for (const propertyName of ["responseText", "response"]) {
            const descriptor = Object.getOwnPropertyDescriptor(xhr, propertyName);
            if (descriptor && descriptor.configurable)
                delete xhr[propertyName];
        }
    }
    function applyLocalizedXhrResponse(xhr) {
        if (!isLocalizableApiUrl(xhr.__tokenessApiUrl) || xhr.__tokenessApiLocalized)
            return;
        if (xhr.responseType === "json") {
            if (xhr.__tokenessApiUrl.includes("/api/status") && xhr.response && xhr.response.data) {
                cachedStatus = xhr.response.data;
                if (typeof enhanceRechargePage === "function")
                    enhanceRechargePage();
            }
            const localizedPayload = localizeApiPayload(xhr.__tokenessApiUrl, xhr.response);
            if (localizedPayload === xhr.response)
                return;
            Object.defineProperty(xhr, "response", { configurable: true, get: () => localizedPayload });
            xhr.__tokenessApiLocalized = true;
            return;
        }
        if (xhr.responseType && xhr.responseType !== "text")
            return;
        const text = xhr.responseText || "";
        if (xhr.__tokenessApiUrl.includes("/api/status") && text) {
            try {
                const parsed = JSON.parse(text);
                if (parsed.data) {
                    cachedStatus = parsed.data;
                    if (typeof enhanceRechargePage === "function")
                        enhanceRechargePage();
                }
            }
            catch (e) { }
        }
        if (xhr.__tokenessApiUrl.includes("/api/user/topup/info") && text) {
            try {
                cacheTopupInfoPayload(JSON.parse(text));
            }
            catch (e) { }
        }
        const localizedText = localizeApiResponseText(xhr.__tokenessApiUrl, text);
        if (!localizedText || localizedText === text)
            return;
        Object.defineProperty(xhr, "responseText", { configurable: true, get: () => localizedText });
        Object.defineProperty(xhr, "response", { configurable: true, get: () => localizedText });
        xhr.__tokenessApiLocalized = true;
    }
    let cachedStatus = null;
    let cachedTopupInfo = null;
    function getExchangeRate() {
        const price = cachedStatus && cachedStatus.price != null
            ? cachedStatus.price
            : cachedStatus && cachedStatus.usd_exchange_rate != null
                ? cachedStatus.usd_exchange_rate
                : DEFAULT_CNY_RATE;
        const numericPrice = Number(price);
        return Number.isFinite(numericPrice) ? numericPrice : DEFAULT_CNY_RATE;
    }
    function usesChineseRechargeText(customAmountInput) {
        const section = customAmountInput && (customAmountInput.closest("form") || customAmountInput.closest("main") || customAmountInput.parentElement);
        const pageText = section ? section.textContent || "" : "";
        return currentLang === "zh" || pageText.includes("待支付金额") || pageText.includes("付款方式") || pageText.includes("推荐计划");
    }
    function cacheTopupInfoPayload(payload) {
        if (payload && payload.data && Array.isArray(payload.data.pay_methods)) {
            cachedTopupInfo = payload.data;
            if (typeof enhancePaymentDialog === "function")
                enhancePaymentDialog();
        }
    }
    function normalizePaymentText(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    }
    function isEpayMethodType(type) {
        const value = normalizePaymentText(type);
        return value !== "" && value !== "stripe" && value !== "waffo_pancake" && value !== "creem";
    }
    function isEpayPaymentMethodName(methodName) {
        const name = normalizePaymentText(methodName);
        const methods = cachedTopupInfo && Array.isArray(cachedTopupInfo.pay_methods)
            ? cachedTopupInfo.pay_methods
            : [];
        const matched = methods.find((method) => normalizePaymentText(method && method.name) === name);
        if (matched)
            return isEpayMethodType(matched.type);
        return /epay|alipay|wxpay|易支付|支付宝|微信/.test(name);
    }
    function watchAnnouncementApis() {
        if (state.apiWatcherStarted)
            return;
        state.apiWatcherStarted = true;
        const originalFetch = window.fetch;
        if (typeof originalFetch === "function") {
            window.fetch = function (input, init) {
                const requestUrl = getFetchRequestUrl(input);
                return originalFetch.call(this, input, init).then((response) => {
                    if (!isLocalizableApiUrl(requestUrl))
                        return response;
                    return response.clone().text().then((text) => {
                        if (requestUrl.includes("/api/status")) {
                            try {
                                const parsed = JSON.parse(text);
                                if (parsed.data) {
                                    cachedStatus = parsed.data;
                                    if (typeof enhanceRechargePage === "function")
                                        enhanceRechargePage();
                                }
                            }
                            catch (e) { }
                        }
                        if (requestUrl.includes("/api/user/topup/info")) {
                            try {
                                cacheTopupInfoPayload(JSON.parse(text));
                            }
                            catch (e) { }
                        }
                        const localizedText = localizeApiResponseText(requestUrl, text);
                        if (localizedText === text)
                            return response;
                        const headers = new Headers(response.headers);
                        headers.delete("content-length");
                        return new Response(localizedText, {
                            status: response.status,
                            statusText: response.statusText,
                            headers
                        });
                    }).catch(() => response);
                });
            };
        }
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, async = true, username, password) {
            this.__tokenessApiUrl = String(url);
            resetLocalizedXhrResponse(this);
            if (!this.__tokenessApiLocalizationAttached) {
                this.__tokenessApiLocalizationAttached = true;
                this.addEventListener("readystatechange", function () {
                    if (this.readyState === 4)
                        applyLocalizedXhrResponse(this);
                });
                this.addEventListener("load", function () {
                    applyLocalizedXhrResponse(this);
                });
            }
            return originalOpen.call(this, method, url, async, username, password);
        };
    }
    const LOCALIZATION_EDITOR_SELECTOR = 'input, textarea, select, option, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
    function isLocalizationEditor(element) {
        return Boolean(element && element.closest(LOCALIZATION_EDITOR_SELECTOR));
    }
    function localizeMultilingualContent(root) {
        if (!root || isSystemSettingsPage())
            return;
        if (root instanceof Element && isLocalizationEditor(root))
            return;
        localizeTokenessTextElements(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let node = walker.nextNode();
        while (node) {
            nodes.push(node);
            node = walker.nextNode();
        }
        for (const textNode of nodes) {
            if (isLocalizationEditor(textNode.parentElement))
                continue;
            const nodeText = textNode.nodeValue || "";
            const sourceText = localizedTextSources.get(textNode) || localizedStringSources.get(nodeText.trim()) || nodeText;
            const localized = parseLocalizedText(sourceText);
            if (typeof localized === "string" && localized.trim()) {
                localizedTextSources.set(textNode, sourceText);
                textNode.nodeValue = localized;
            }
        }
    }
    function localizeTokenessTextElements(root) {
        if (!root || typeof root.querySelectorAll !== "function")
            return;
        const parents = new Set();
        for (const element of Array.from(root.querySelectorAll("tokeness-text"))) {
            if (element.parentElement && !isLocalizationEditor(element))
                parents.add(element.parentElement);
        }
        for (const parent of parents) {
            const groups = [];
            let group = [];
            const languages = new Set();
            const flushGroup = () => {
                if (group.length > 0)
                    groups.push(group);
                group = [];
                languages.clear();
            };
            for (const child of Array.from(parent.childNodes)) {
                if (child instanceof Element && child.tagName.toLowerCase() === "tokeness-text") {
                    const language = readSupportedLanguage(child.getAttribute("lang"));
                    if (!language) {
                        flushGroup();
                        continue;
                    }
                    if (languages.has(language))
                        flushGroup();
                    group.push(child);
                    languages.add(language);
                    continue;
                }
                if (child.nodeType !== Node.TEXT_NODE || (child.textContent || "").trim())
                    flushGroup();
            }
            flushGroup();
            for (const localizedElements of groups) {
                const values = {};
                for (const element of localizedElements) {
                    const language = readSupportedLanguage(element.getAttribute("lang"));
                    if (language)
                        values[language] = element.textContent || "";
                }
                const localized = pickLocalizedValue(values);
                if (typeof localized !== "string")
                    continue;
                const sourceText = localizedElements.map((element) => element.outerHTML).join("");
                const textNode = document.createTextNode(localized);
                parent.insertBefore(textNode, localizedElements[0]);
                for (const element of localizedElements)
                    element.remove();
                localizedTextSources.set(textNode, sourceText);
            }
        }
    }
    function watchNewApiLanguage() {
        if (state.languageWatcherStarted)
            return;
        state.languageWatcherStarted = true;
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function (key, value) {
            originalSetItem.call(this, key, value);
            if (key === "i18nextLng") {
                setTimeout(refreshLanguage, 0);
            }
        };
        window.addEventListener("storage", (event) => {
            if (event.key === "i18nextLng")
                refreshLanguage();
        });
        const observeLanguageRoot = () => {
            const root = document.documentElement;
            if (!root || root.nodeType !== 1)
                return;
            if (state.languageObserver)
                return;
            state.languageObserver = new MutationObserver(scheduleLanguageRefresh);
            state.languageObserver.observe(root, {
                attributes: true,
                attributeFilter: ["lang"]
            });
        };
        observeLanguageRoot();
        if (!document.documentElement || document.documentElement.nodeType !== 1) {
            document.addEventListener("DOMContentLoaded", observeLanguageRoot, { once: true });
        }
    }
    // CSS 样式
    const TOKENESS_HOME_STYLE = `
/* Hide original main content */
.tokeness-hide-original > *:not(#tokeness-home-wrapper):nth-child(n+3):nth-last-child(n+2) {
  display: none !important;
}

/* Tokeness notice / announcement section */
.tokeness-notice {
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px 20px;
  line-height: 1.6;
  font-size: 14px;
  color: var(--tokeness-foreground, var(--foreground, #151515));
}
.tokeness-notice h3, .tokeness-notice h4 {
  margin: 12px 0 6px;
  font-size: 15px;
  font-weight: 700;
}
.tokeness-notice p { margin: 6px 0; }
.tokeness-notice a { color: var(--tokeness-primary, #722ed1); }
.tokeness-notice code {
  background: rgba(114, 46, 209, 0.08);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 13px;
}

.tokeness-recharge-note {
  font-size: 13px;
  font-weight: 600;
  color: var(--tokeness-foreground, var(--foreground, #151515));
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  min-height: 36px;
  padding: 0 2px;
  white-space: nowrap;
}
.tokeness-recharge-note svg {
  display: none;
}

.tokeness-recharge-row {
  position: relative;
}
.tokeness-recharge-row::after {
  content: attr(data-tokeness-recharge-note);
  color: var(--tokeness-foreground, var(--foreground, #151515));
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  justify-self: center;
  grid-column: 2;
  grid-row: 1;
  min-height: 36px;
  padding: 0 2px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.tokeness-payable-amount-target {
  position: relative;
  display: inline-flex !important;
  justify-content: flex-end;
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  min-width: max(4em, 100%);
}
.tokeness-payable-amount-target::after {
  content: attr(data-tokeness-payable-text);
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--tokeness-foreground, var(--foreground, #151515));
  -webkit-text-fill-color: var(--tokeness-foreground, var(--foreground, #151515));
  white-space: nowrap;
}
.tokeness-payment-dialog-hidden-row {
  display: none !important;
}
.tokeness-payment-dialog-epay-notice-row {
  display: block !important;
  border: 1px solid var(--tokeness-border, var(--border, #d8d5cc));
  border-radius: 8px;
  background: var(--tokeness-card, var(--card, #ffffff));
  padding: 10px 12px;
}
.tokeness-payment-dialog-epay-notice-row > * {
  display: none !important;
}
.tokeness-payment-dialog-epay-notice-row::after {
  content: attr(data-tokeness-epay-notice);
  display: block;
  color: var(--tokeness-foreground, var(--foreground, #151515));
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}
.tokeness-referral-copy {
  display: block !important;
  -webkit-line-clamp: initial !important;
  overflow: visible !important;
  white-space: normal !important;
}
.tokeness-referral-stats {
  grid-template-columns: minmax(0, 1fr) !important;
}
.tokeness-referral-hidden-stat {
  display: none !important;
}
.tokeness-referral-transfer-hidden {
  display: none !important;
}

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
    // HTML 内容
    function getTokenessHomeHTML() {
        return `<section class="tokeness-home">
  <div class="tokeness-shell">
    <div class="tokeness-top-spacer" aria-hidden="true"></div>
    <section class="tokeness-hero">
      <div class="tokeness-hero-main">
        <div class="tokeness-system-mark">${t('heroKicker')}</div>
        <h1 class="tokeness-hero-title">${t('heroTitle')}</h1>
        <p class="tokeness-hero-copy">
          ${t('heroCopy')}
        </p>
        <div class="tokeness-actions">
          <a class="tokeness-btn primary" href="/dashboard">${t('btnDashboard')}</a>
          <a class="tokeness-btn secondary" href="/pricing">${t('btnPricing')}</a>
        </div>
      </div>
      <aside class="tokeness-hero-side">
        <p class="tokeness-side-title">${t('stepsTitle')}</p>
        <div class="tokeness-steps">
          <div class="tokeness-step"><span class="tokeness-step-num">1</span><span>${t('step1')}</span></div>
          <div class="tokeness-step"><span class="tokeness-step-num">2</span><span>${t('step2')}</span></div>
          <div class="tokeness-step"><span class="tokeness-step-num">3</span><span>${t('step3')}</span></div>
        </div>
      </aside>
    </section>
    <section class="tokeness-structure">
      <div class="tokeness-card" data-index="A01"><strong>${t('cardA01Title')}</strong><span>${t('cardA01Desc')}</span></div>
      <div class="tokeness-card" data-index="A02"><strong>${t('cardA02Title')}</strong><span>${t('cardA02Desc')}</span></div>
      <div class="tokeness-card" data-index="A03"><strong>${t('cardA03Title')}</strong><span>${t('cardA03Desc')}</span></div>
      <div class="tokeness-card" data-index="A04"><strong>${t('cardA04Title')}</strong><span>${t('cardA04Desc')}</span></div>
    </section>
    <section class="tokeness-notice" id="tokeness-notice-section"></section>
    <section class="tokeness-band">
      <div class="tokeness-band-text">
        <div class="tokeness-band-label">${t('bandLabel')}</div>
        <h2 class="tokeness-band-title">${t('bandTitle')}</h2>
        <p class="tokeness-band-copy">
          ${t('bandCopy')}
        </p>
      </div>
      <div class="tokeness-band-stats">
        <div class="tokeness-stat"><b>30+</b><span>providers</span></div>
        <div class="tokeness-stat"><b>1</b><span>gateway</span></div>
        <div class="tokeness-stat"><b>3</b><span>layers</span></div>
      </div>
    </section>
    <section class="tokeness-block tokeness-supplier">
      <div class="tokeness-gridline-row"><span>${t('supplierLabel')}</span></div>
      <div class="tokeness-provider-matrix">
        <div class="tokeness-provider-tile"><svg fill="currentColor" fill-rule="evenodd" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>MoonshotAI</title><path d="M1.052 16.916l9.539 2.552a21.007 21.007 0 00.06 2.033l5.956 1.593a11.997 11.997 0 01-5.586.865l-.18-.016-.044-.004-.084-.009-.094-.01a11.605 11.605 0 01-.157-.02l-.107-.014-.11-.016a11.962 11.962 0 01-.32-.051l-.042-.008-.075-.013-.107-.02-.07-.015-.093-.019-.075-.016-.095-.02-.097-.023-.094-.022-.068-.017-.088-.022-.09-.024-.095-.025-.082-.023-.109-.03-.062-.02-.084-.025-.093-.028-.105-.034-.058-.019-.08-.026-.09-.031-.066-.024a6.293 6.293 0 01-.044-.015l-.068-.025-.101-.037-.057-.022-.08-.03-.087-.035-.088-.035-.079-.032-.095-.04-.063-.028-.063-.027a5.655 5.655 0 01-.041-.018l-.066-.03-.103-.047-.052-.024-.096-.046-.062-.03-.084-.04-.086-.044-.093-.047-.052-.027-.103-.055-.057-.03-.058-.032a6.49 6.49 0 01-.046-.026l-.094-.053-.06-.034-.051-.03-.072-.041-.082-.05-.093-.056-.052-.032-.084-.053-.061-.039-.079-.05-.07-.047-.053-.035a7.785 7.785 0 01-.054-.036l-.044-.03-.044-.03a6.066 6.066 0 01-.04-.028l-.057-.04-.076-.054-.069-.05-.074-.054-.056-.042-.076-.057-.076-.059-.086-.067-.045-.035-.064-.052-.074-.06-.089-.073-.046-.039-.046-.039a7.516 7.516 0 01-.043-.037l-.045-.04-.061-.053-.07-.062-.068-.06-.062-.058-.067-.062-.053-.05-.088-.084a13.28 13.28 0 01-.099-.097l-.029-.028-.041-.042-.069-.07-.05-.051-.05-.053a6.457 6.457 0 01-.168-.179l-.08-.088-.062-.07-.071-.08-.042-.049-.053-.062-.058-.068-.046-.056a7.175 7.175 0 01-.027-.033l-.045-.055-.066-.082-.041-.052-.05-.064-.02-.025a11.99 11.99 0 01-1.44-2.402zm-1.02-5.794l11.353 3.037a20.468 20.468 0 00-.469 2.011l10.817 2.894a12.076 12.076 0 01-1.845 2.005L.657 15.923l-.016-.046-.035-.104a11.965 11.965 0 01-.05-.153l-.007-.023a11.896 11.896 0 01-.207-.741l-.03-.126-.018-.08-.021-.097-.018-.081-.018-.09-.017-.084-.018-.094c-.026-.141-.05-.283-.071-.426l-.017-.118-.011-.083-.013-.102a12.01 12.01 0 01-.019-.161l-.005-.047a12.12 12.12 0 01-.034-2.145zm1.593-5.15l11.948 3.196c-.368.605-.705 1.231-1.01 1.875l11.295 3.022c-.142.82-.368 1.612-.668 2.365l-11.55-3.09L.124 10.26l.015-.1.008-.049.01-.067.015-.087.018-.098c.026-.148.056-.295.088-.442l.028-.124.02-.085.024-.097c.022-.09.045-.18.07-.268l.028-.102.023-.083.03-.1.025-.082.03-.096.026-.082.031-.095a11.896 11.896 0 011.01-2.232zm4.442-4.4L17.352 4.59a20.77 20.77 0 00-1.688 1.721l7.823 2.093c.267.852.442 1.744.513 2.665L2.106 5.213l.045-.065.027-.04.04-.055.046-.065.055-.076.054-.072.064-.086.05-.065.057-.073.055-.07.06-.074.055-.069.065-.077.054-.066.066-.077.053-.06.072-.082.053-.06.067-.074.054-.058.073-.078.058-.06.063-.067.168-.17.1-.098.059-.056.076-.071a12.084 12.084 0 012.272-1.677zM12.017 0h.097l.082.001.069.001.054.002.068.002.046.001.076.003.047.002.06.003.054.002.087.005.105.007.144.011.088.007.044.004.077.008.082.008.047.005.102.012.05.006.108.014.081.01.042.006.065.01.207.032.07.012.065.011.14.026.092.018.11.022.046.01.075.016.041.01L14.7.3l.042.01.065.015.049.012.071.017.096.024.112.03.113.03.113.032.05.015.07.02.078.024.073.023.05.016.05.016.076.025.099.033.102.036.048.017.064.023.093.034.11.041.116.045.1.04.047.02.06.024.041.018.063.026.04.018.057.025.11.048.1.046.074.035.075.036.06.028.092.046.091.045.102.052.053.028.049.026.046.024.06.033.041.022.052.029.088.05.106.06.087.051.057.034.053.032.096.059.088.055.098.062.036.024.064.041.084.056.04.027.062.042.062.043.023.017c.054.037.108.075.161.114l.083.06.065.048.056.043.086.065.082.064.04.03.05.041.086.069.079.065.085.071c.712.6 1.353 1.283 1.909 2.031L7.222.994l.062-.027.065-.028.081-.034.086-.035c.113-.045.227-.09.341-.131l.096-.035.093-.033.084-.03.096-.031c.087-.03.176-.058.264-.085l.091-.027.086-.025.102-.03.085-.023.1-.026L9.04.37l.09-.023.091-.022.095-.022.09-.02.098-.021.091-.02.095-.018.092-.018.1-.018.091-.016.098-.017.092-.014.097-.015.092-.013.102-.013.091-.012.105-.012.09-.01.105-.01c.093-.01.186-.018.28-.024l.106-.008.09-.005.11-.006.093-.004.1-.004.097-.002.099-.002.197-.002z"></path></svg></div>
        <div class="tokeness-provider-tile"><svg fill="currentColor" fill-rule="evenodd" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>OpenAI</title><path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z"></path></svg></div>
        <div class="tokeness-provider-tile"><svg fill="currentColor" fill-rule="evenodd" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Grok</title><path d="M6.469 8.776L16.512 23h-4.464L2.005 8.776H6.47zm-.004 7.9l2.233 3.164L6.467 23H2l4.465-6.324zM22 2.582V23h-3.659V7.764L22 2.582zM22 1l-9.952 14.095-2.233-3.163L17.533 1H22z"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Zhipu</title><path d="M11.991 23.503a.24.24 0 00-.244.248.24.24 0 00.244.249.24.24 0 00.245-.249.24.24 0 00-.22-.247l-.025-.001zM9.671 5.365a1.697 1.697 0 011.099 2.132l-.071.172-.016.04-.018.054c-.07.16-.104.32-.104.498-.035.71.47 1.279 1.186 1.314h.366c1.309.053 2.338 1.173 2.286 2.523-.052 1.332-1.152 2.38-2.478 2.327h-.174c-.715.018-1.274.64-1.239 1.368 0 .124.018.23.053.337.209.373.54.658.96.8.75.23 1.517-.125 1.9-.782l.018-.035c.402-.64 1.17-.96 1.92-.711.854.284 1.378 1.226 1.099 2.167a1.661 1.661 0 01-2.077 1.102 1.711 1.711 0 01-.907-.711l-.017-.035c-.2-.323-.463-.58-.851-.711l-.056-.018a1.646 1.646 0 00-1.954.746 1.66 1.66 0 01-1.065.764 1.677 1.677 0 01-1.989-1.279c-.209-.906.332-1.83 1.257-2.043a1.51 1.51 0 01.296-.035h.018c.68-.071 1.151-.622 1.116-1.333a1.307 1.307 0 00-.227-.693 2.515 2.515 0 01-.366-1.403 2.39 2.39 0 01.366-1.208c.14-.195.21-.444.227-.693.018-.71-.506-1.261-1.186-1.332l-.07-.018a1.43 1.43 0 01-.299-.07l-.05-.019a1.7 1.7 0 01-1.047-2.114 1.68 1.68 0 012.094-1.101zm-5.575 10.11c.26-.264.639-.367.994-.27.355.096.633.379.728.74.095.362-.007.748-.267 1.013-.402.41-1.053.41-1.455 0a1.062 1.062 0 010-1.482zm14.845-.294c.359-.09.738.024.992.297.254.274.344.665.237 1.025-.107.36-.396.634-.756.718-.551.128-1.1-.22-1.23-.781a1.05 1.05 0 01.757-1.26zm-.064-4.39c.314.32.49.753.49 1.206 0 .452-.176.886-.49 1.206-.315.32-.74.5-1.185.5-.444 0-.87-.18-1.184-.5a1.727 1.727 0 010-2.412 1.654 1.654 0 012.369 0zm-11.243.163c.364.484.447 1.128.218 1.691a1.665 1.665 0 01-2.188.923c-.855-.36-1.26-1.358-.907-2.228a1.68 1.68 0 011.33-1.038c.593-.08 1.183.169 1.547.652zm11.545-4.221c.368 0 .708.2.892.524.184.324.184.724 0 1.048a1.026 1.026 0 01-.892.524c-.568 0-1.03-.47-1.03-1.048 0-.579.462-1.048 1.03-1.048zm-14.358 0c.368 0 .707.2.891.524.184.324.184.724 0 1.048a1.026 1.026 0 01-.891.524c-.569 0-1.03-.47-1.03-1.048 0-.579.461-1.048 1.03-1.048zm10.031-1.475c.925 0 1.675.764 1.675 1.706s-.75 1.705-1.675 1.705-1.674-.763-1.674-1.705c0-.942.75-1.706 1.674-1.706zm-2.626-.684c.362-.082.653-.356.761-.718a1.062 1.062 0 00-.238-1.028 1.017 1.017 0 00-.996-.294c-.547.14-.881.7-.752 1.257.13.558.675.907 1.225.783zm0 16.876c.359-.087.644-.36.75-.72a1.062 1.062 0 00-.237-1.019 1.018 1.018 0 00-.985-.301 1.037 1.037 0 00-.762.717c-.108.361-.017.754.239 1.028.245.263.606.377.953.305l.043-.01zM17.19 3.5a.631.631 0 00.628-.64c0-.355-.279-.64-.628-.64a.631.631 0 00-.628.64c0 .355.28.64.628.64zm-10.38 0a.631.631 0 00.628-.64c0-.355-.28-.64-.628-.64a.631.631 0 00-.628.64c0 .355.279.64.628.64zm-5.182 7.852a.631.631 0 00-.628.64c0 .354.28.639.628.639a.63.63 0 00.627-.606l.001-.034a.62.62 0 00-.628-.64zm5.182 9.13a.631.631 0 00-.628.64c0 .355.279.64.628.64a.631.631 0 00.628-.64c0-.355-.28-.64-.628-.64zm10.38.018a.631.631 0 00-.628.64c0 .355.28.64.628.64a.631.631 0 00.628-.64c0-.355-.279-.64-.628-.64zm5.182-9.148a.631.631 0 00-.628.64c0 .354.279.639.628.639a.631.631 0 00.628-.64c0-.355-.28-.64-.628-.64zm-.384-4.992a.24.24 0 00.244-.249.24.24 0 00-.244-.249.24.24 0 00-.244.249c0 .142.122.249.244.249zM11.991.497a.24.24 0 00.245-.248A.24.24 0 0011.99 0a.24.24 0 00-.244.249c0 .133.108.236.223.247l.021.001zM2.011 6.36a.24.24 0 00.245-.249.24.24 0 00-.244-.249.24.24 0 00-.244.249.24.24 0 00.244.249zm0 11.263a.24.24 0 00-.243.248.24.24 0 00.244.249.24.24 0 00.244-.249.252.252 0 00-.244-.248zm19.995-.018a.24.24 0 00-.245.248.24.24 0 00.245.25.24.24 0 00.244-.25.252.252 0 00-.244-.248z" fill="#3859FF" fill-rule="nonzero"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Volcengine</title><path d="M19.44 10.153l-2.936 11.586a.215.215 0 00.214.261h5.87a.215.215 0 00.214-.261l-2.95-11.586a.214.214 0 00-.412 0zM3.28 12.778l-2.275 8.96A.214.214 0 001.22 22h4.532a.212.212 0 00.214-.165.214.214 0 000-.097l-2.276-8.96a.214.214 0 00-.41 0z" fill="#00E5E5"></path><path d="M7.29 5.359L3.148 21.738a.215.215 0 00.203.261h8.29a.214.214 0 00.215-.261L7.7 5.358a.214.214 0 00-.41 0z" fill="#006EFF"></path><path d="M14.44.15a.214.214 0 00-.41 0L8.366 21.739a.214.214 0 00.214.261H19.9a.216.216 0 00.171-.078.214.214 0 00.044-.183L14.439.15z" fill="#006EFF"></path><path d="M10.278 7.741L6.685 21.736a.214.214 0 00.214.264h7.17a.215.215 0 00.214-.264L10.688 7.741a.214.214 0 00-.41 0z" fill="#00E5E5"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Cohere</title><path clip-rule="evenodd" d="M8.128 14.099c.592 0 1.77-.033 3.398-.703 1.897-.781 5.672-2.2 8.395-3.656 1.905-1.018 2.74-2.366 2.74-4.18A4.56 4.56 0 0018.1 1H7.549A6.55 6.55 0 001 7.55c0 3.617 2.745 6.549 7.128 6.549z" fill="#39594D" fill-rule="evenodd"></path><path clip-rule="evenodd" d="M9.912 18.61a4.387 4.387 0 012.705-4.052l3.323-1.38c3.361-1.394 7.06 1.076 7.06 4.715a5.104 5.104 0 01-5.105 5.104l-3.597-.001a4.386 4.386 0 01-4.386-4.387z" fill="#D18EE2" fill-rule="evenodd"></path><path d="M4.776 14.962A3.775 3.775 0 001 18.738v.489a3.776 3.776 0 007.551 0v-.49a3.775 3.775 0 00-3.775-3.775z" fill="#FF7759"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Claude</title><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fill-rule="nonzero"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Gemini</title><defs><linearGradient id="lobe-icons-gemini-fill" x1="0%" x2="68.73%" y1="100%" y2="30.395%"><stop offset="0%" stop-color="#1C7DFF"></stop><stop offset="52.021%" stop-color="#1C69FF"></stop><stop offset="100%" stop-color="#F0DCD6"></stop></linearGradient></defs><path d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12" fill="url(#lobe-icons-gemini-fill)" fill-rule="nonzero"></path></svg></div>
        <div class="tokeness-provider-tile"><svg fill="currentColor" fill-rule="evenodd" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Suno</title><path d="M16.5 0C20.642 0 24 5.373 24 12h-9c0 6.627-3.358 12-7.5 12C3.358 24 0 18.627 0 12h9c0-6.627 3.358-12 7.5-12z"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Minimax</title><defs><linearGradient id="lobe-icons-minimax-fill" x1="0%" x2="100.182%" y1="50.057%" y2="50.057%"><stop offset="0%" stop-color="#E2167E"></stop><stop offset="100%" stop-color="#FE603C"></stop></linearGradient></defs><path d="M16.278 2c1.156 0 2.093.927 2.093 2.07v12.501a.74.74 0 00.744.709.74.74 0 00.743-.709V9.099a2.06 2.06 0 012.071-2.049A2.06 2.06 0 0124 9.1v6.561a.649.649 0 01-.652.645.649.649 0 01-.653-.645V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v7.472a2.037 2.037 0 01-2.048 2.026 2.037 2.037 0 01-2.048-2.026v-12.5a.785.785 0 00-.788-.753.785.785 0 00-.789.752l-.001 15.904A2.037 2.037 0 0113.441 22a2.037 2.037 0 01-2.048-2.026V18.04c0-.356.292-.645.652-.645.36 0 .652.289.652.645v1.934c0 .263.142.506.372.638.23.131.514.131.744 0a.734.734 0 00.372-.638V4.07c0-1.143.937-2.07 2.093-2.07zm-5.674 0c1.156 0 2.093.927 2.093 2.07v11.523a.648.648 0 01-.652.645.648.648 0 01-.652-.645V4.07a.785.785 0 00-.789-.78.785.785 0 00-.789.78v14.013a2.06 2.06 0 01-2.07 2.048 2.06 2.06 0 01-2.071-2.048V9.1a.762.762 0 00-.766-.758.762.762 0 00-.766.758v3.8a2.06 2.06 0 01-2.071 2.049A2.06 2.06 0 010 12.9v-1.378c0-.357.292-.646.652-.646.36 0 .653.29.653.646V12.9c0 .418.343.757.766.757s.766-.339.766-.757V9.099a2.06 2.06 0 012.07-2.048 2.06 2.06 0 012.071 2.048v8.984c0 .419.343.758.767.758.423 0 .766-.339.766-.758V4.07c0-1.143.937-2.07 2.093-2.07z" fill="url(#lobe-icons-minimax-fill)" fill-rule="nonzero"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Wenxin</title><defs><linearGradient id="lobe-icons-wenxin-fill" x1="9.155%" x2="90.531%" y1="75.177%" y2="25.028%"><stop offset="0%" stop-color="#0A51C3"></stop><stop offset="100%" stop-color="#23A4FB"></stop></linearGradient></defs><g fill="none" fill-rule="nonzero"><path d="M11.32 1.176a1.4 1.4 0 011.36 0l8.64 4.843c.421.234.68.67.68 1.141v9.68c0 .472-.259.908-.68 1.143l-8.64 4.84a1.4 1.4 0 01-1.36 0l-8.64-4.84A1.31 1.31 0 012 16.84V7.159c0-.471.259-.907.68-1.142l8.64-4.84zm7.42 13.839V8.227L12.002 12 12 19.551l6.059-3.394a1.31 1.31 0 00.68-1.142zM12.68 4.833a1.393 1.393 0 00-1.36 0L5.944 7.846c-.421.235-.68.67-.68 1.142v6.027c0 .47.259.905.68 1.142l2.795 1.566V11.09a1.546 1.546 0 00.221.79 1.527 1.527 0 01-.216-.834l.004-.094.02-.15.018-.084.017-.062.039-.117.062-.142.035-.065.081-.13.094-.122.084-.091.08-.075.125-.1.071-.048.134-.076 5.87-3.29-2.796-1.566z" fill="url(#lobe-icons-wenxin-fill)"></path><path d="M12 11.088c0-.875-.73-1.584-1.631-1.584a1.66 1.66 0 00-.855.237c-.027.016-.055.033-.08.05a2.361 2.361 0 00-.123.093c-.022.02-.045.038-.066.059l-.048.045-.063.067c-.014.016-.028.031-.04.048a2.303 2.303 0 00-.094.125l-.042.069a1.7 1.7 0 00-.07.13l-.036.081a.764.764 0 00-.022.06c-.01.03-.02.058-.028.087l-.017.062a.883.883 0 00-.03.16c-.002.025-.007.05-.008.074a1.527 1.527 0 00.213.929c.302.508.85.792 1.414.792.277 0 .558-.068.814-.212l.815-.457v-.914L12 11.088z" fill="#012F8D"></path></g></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Spark</title><path d="M2 13.08C2 9.182 4.772 6.367 9.32 2.122c-.65 7.883 6.41 8.272 5.023 12.214-.99 2.815-4.244 1.949-4.59 1.342 0 0 1.212.347 1.385-.866.174-1.213-2.252-1.862-3.81-4.937-2.6 2.988-.954 9.008 4.2 9.008 4.764 0 6.583-4.937 4.894-8.099 0 0 4.071.693 4.418 3.811.346 3.119-3.638 8.533-9.095 8.403C6.288 22.868 2 18.84 2 13.08z" fill="#3DC8F9"></path><path d="M17.852 6.107L11.615 0c-.52 5.933.866 8.374 4.894 9.485 2.729.753 3.307 1.04 4.504 2.772-.338-2.407-.78-3.812-3.161-6.15z" fill="#EA0100"></path><path clip-rule="evenodd" d="M9.033 18.323c.709.354 1.542.56 2.495.56 4.764 0 6.583-4.937 4.894-8.099 0 0 4.071.693 4.418 3.811.156 1.403-.565 3.27-1.902 4.89-3.458 1.57-7.29.84-9.905-1.162z" fill="#1652D8" fill-rule="evenodd"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Qingyan</title><g fill="none" fill-rule="evenodd"><path d="M6.075 10.494C7.6 9.446 9.768 8.759 12.222 8.759c2.453 0 4.622.687 6.147 1.735.77.53 1.352 1.133 1.74 1.77C20 10 20 10 20.687 9.362a9.276 9.276 0 00-1.008-.8c-1.958-1.347-4.598-2.143-7.457-2.143-2.858 0-5.499.796-7.457 2.144-1.955 1.345-3.325 3.322-3.325 5.647 0 2.326 1.37 4.303 3.322 5.646C6.721 21.205 9.362 22 12.22 22c2.859 0 5.5-.795 7.457-2.144C21.63 18.513 23 16.538 23 14.21c0-1.48-.554-2.817-1.46-3.94-.046 1.036-.41 2.03-1.012 2.937.099.325.149.663.15 1.003 0 1.33-.782 2.664-2.313 3.717-1.524 1.048-3.692 1.735-6.146 1.735-2.453 0-4.623-.687-6.147-1.735C4.544 16.874 3.76 15.54 3.76 14.21c.003-1.33.785-2.663 2.315-3.716z" fill="#3762FF"></path><path d="M3.747 11.494c-.62 1.77-.473 3.365.332 4.51.806 1.144 2.254 1.813 4.117 1.813 1.86 0 4.029-.68 6.021-2.1 1.993-1.42 3.35-3.251 3.967-5.017.62-1.769.473-3.364-.332-4.51-.806-1.143-2.254-1.812-4.117-1.812-1.86 0-4.029.68-6.021 2.099-1.993 1.42-3.35 3.252-3.967 5.017zm-2.228-.79c.8-2.28 2.487-4.498 4.83-6.167C8.691 2.866 11.33 2 13.734 2c2.4 0 4.678.874 6.045 2.817 1.366 1.943 1.431 4.394.633 6.674-.8 2.282-2.487 4.499-4.83 6.168-2.344 1.67-4.981 2.536-7.387 2.537-2.4 0-4.678-.874-6.045-2.817-1.368-1.943-1.431-4.396-.633-6.674h.002z" fill="#1041F3"></path></g></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>DeepSeek</title><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Qwen</title><defs><linearGradient id="lobe-icons-qwen-fill" x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" stop-color="#00055F" stop-opacity=".84"></stop><stop offset="100%" stop-color="#6F69F7" stop-opacity=".84"></stop></linearGradient></defs><path d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z" fill="url(#lobe-icons-qwen-fill)" fill-rule="nonzero"></path></svg></div>
        <div class="tokeness-provider-tile"><svg fill="currentColor" fill-rule="evenodd" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Midjourney</title><path d="M22.369 17.676c-1.387 1.259-3.17 2.378-5.332 3.417.044.03.086.057.13.083l.018.01.019.012c.216.123.42.184.641.184.222 0 .426-.061.642-.184l.018-.011.019-.011c.14-.084.266-.178.492-.366l.178-.148c.279-.232.426-.342.625-.456.304-.174.612-.266.949-.266.337 0 .645.092.949.266l.023.014c.188.109.334.219.602.442l.178.148c.221.184.346.278.483.36l.028.017.018.01c.21.12.407.181.62.185h.022a.31.31 0 110 .618c-.337 0-.645-.092-.95-.266a3.137 3.137 0 01-.09-.054l-.022-.014-.022-.013-.02-.014a5.356 5.356 0 01-.49-.377l-.159-.132a3.836 3.836 0 00-.483-.36l-.027-.017-.019-.01a1.256 1.256 0 00-.641-.185c-.222 0-.426.061-.641.184l-.02.011-.018.011c-.14.084-.266.178-.492.366l-.158.132a5.125 5.125 0 01-.51.39l-.022.014-.022.014-.09.054a1.868 1.868 0 01-.95.266c-.337 0-.644-.092-.949-.266a3.137 3.137 0 01-.09-.054l-.022-.014-.022-.013-.026-.017a4.881 4.881 0 01-.425-.325.308.308 0 01-.12-.1l-.098-.081a3.836 3.836 0 00-.483-.36l-.027-.017-.019-.01a1.256 1.256 0 00-.641-.185c-.222 0-.426.061-.642.184l-.018.011-.019.011c-.14.084-.266.178-.492.366l-.158.132a5.125 5.125 0 01-.51.39l-.023.014-.022.014-.09.054A1.868 1.868 0 0112 22c-.337 0-.645-.092-.949-.266a3.137 3.137 0 01-.09-.054l-.022-.014-.022-.013-.021-.014a5.356 5.356 0 01-.49-.377l-.158-.132a3.836 3.836 0 00-.483-.36l-.028-.017-.018-.01a1.256 1.256 0 00-.642-.185c-.221 0-.425.061-.641.184l-.019.011-.018.011c-.141.084-.266.178-.492.366l-.158.132a5.125 5.125 0 01-.511.39l-.022.014-.022.014-.09.054a1.868 1.868 0 01-.986.264c-.746-.09-1.319-.38-1.89-.866l-.035-.03c-.047-.041-.118-.106-.192-.174l-.196-.181-.107-.1-.011-.01a1.531 1.531 0 00-.336-.253.313.313 0 00-.095-.03h-.005c-.119.022-.238.059-.361.11a.308.308 0 01-.077.061l-.008.005a.309.309 0 01-.126.034 5.66 5.66 0 00-.774.518l-.416.324-.055.043a6.542 6.542 0 01-.324.236c-.305.207-.552.315-.8.315a.31.31 0 01-.01-.618h.01c.09 0 .235-.062.438-.198l.04-.027c.077-.054.163-.117.27-.199l.385-.301.06-.047c.268-.206.506-.373.73-.505l-.633-1.21a.309.309 0 01.254-.451l20.287-1.305a.309.309 0 01.228.537zm-1.118.14L2.369 19.03l.423.809c.128-.045.256-.078.388-.1a.31.31 0 01.052-.005c.132 0 .26.032.386.093.153.073.294.179.483.35l.016.015.092.086.144.134.097.089c.065.06.125.114.16.144.485.418.948.658 1.554.736h.011a1.25 1.25 0 00.6-.172l.021-.011.019-.011.018-.011c.141-.084.266-.178.492-.366l.178-.148c.279-.232.426-.342.625-.456.305-.174.612-.266.95-.266.336 0 .644.092.948.266l.023.014c.188.109.335.219.603.442l.177.148c.222.184.346.278.484.36l.027.017.019.01c.215.124.42.185.641.185.222 0 .426-.061.641-.184l.019-.011.018-.011c.141-.084.267-.178.493-.366l.177-.148c.28-.232.427-.342.626-.456.304-.174.612-.266.949-.266.337 0 .644.092.949.266l.025.015c.187.109.334.22.603.443 1.867-.878 3.448-1.811 4.73-2.832l.02-.016zM3.653 2.026C6.073 3.06 8.69 4.941 10.8 7.258c2.46 2.7 4.109 5.828 4.637 9.149a.31.31 0 01-.421.335c-2.348-.945-4.54-1.258-6.59-1.02-1.739.2-3.337.792-4.816 1.703-.294.182-.62-.182-.405-.454 1.856-2.355 2.581-4.99 2.343-7.794-.195-2.292-1.031-4.61-2.284-6.709a.31.31 0 01.388-.442zM10.04 4.45c1.778.543 3.892 2.102 5.782 4.243 1.984 2.248 3.552 4.934 4.347 7.582a.31.31 0 01-.401.38l-.022-.01-.386-.154a10.594 10.594 0 00-.291-.112l-.016-.006c-.68-.247-1.199-.291-1.944-.101a.31.31 0 01-.375-.218C15.378 11.123 13.073 7.276 9.775 5c-.291-.201-.072-.653.266-.55zM4.273 2.996l.008.015c1.028 1.94 1.708 4.031 1.885 6.113.213 2.513-.31 4.906-1.673 7.092l-.02.031.003-.001c1.198-.581 2.47-.969 3.825-1.132l.055-.006c1.981-.23 4.083.029 6.309.837l.066.025-.007-.039c-.593-2.95-2.108-5.737-4.31-8.179l-.07-.078c-1.785-1.96-3.944-3.6-6.014-4.65l-.057-.028zm7.92 3.238l.048.048c2.237 2.295 3.885 5.431 4.974 9.191l.038.132.022-.004c.71-.133 1.284-.063 1.963.18l.027.01.066.024.046.018-.025-.073c-.811-2.307-2.208-4.62-3.936-6.594l-.058-.065c-1.02-1.155-2.103-2.132-3.15-2.856l-.015-.011z"></path></svg></div>
        <div class="tokeness-provider-tile"><svg fill="currentColor" fill-rule="evenodd" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Grok</title><path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"></path></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>AzureAI</title><path clip-rule="evenodd" d="M16.233 0c.713 0 1.345.551 1.572 1.329.227.778 1.555 5.59 1.555 5.59v9.562h-4.813L14.645 0h1.588z" fill="url(#lobe-icons-azureai-fill-0)" fill-rule="evenodd"></path><path d="M23.298 7.47c0-.34-.275-.6-.6-.6h-2.835a3.617 3.617 0 00-3.614 3.615v5.996h3.436a3.617 3.617 0 003.613-3.614V7.47z" fill="url(#lobe-icons-azureai-fill-1)"></path><path clip-rule="evenodd" d="M16.233 0a.982.982 0 00-.989.989l-.097 18.198A4.814 4.814 0 0110.334 24H1.6a.597.597 0 01-.567-.794l7-19.981A4.819 4.819 0 0112.57 0h3.679-.016z" fill="url(#lobe-icons-azureai-fill-2)" fill-rule="evenodd"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-azureai-fill-0" x1="18.242" x2="14.191" y1="16.837" y2=".616"><stop stop-color="#712575"></stop><stop offset=".09" stop-color="#9A2884"></stop><stop offset=".18" stop-color="#BF2C92"></stop><stop offset=".27" stop-color="#DA2E9C"></stop><stop offset=".34" stop-color="#EB30A2"></stop><stop offset=".4" stop-color="#F131A5"></stop><stop offset=".5" stop-color="#EC30A3"></stop><stop offset=".61" stop-color="#DF2F9E"></stop><stop offset=".72" stop-color="#C92D96"></stop><stop offset=".83" stop-color="#AA2A8A"></stop><stop offset=".95" stop-color="#83267C"></stop><stop offset="1" stop-color="#712575"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-azureai-fill-1" x1="19.782" x2="19.782" y1=".34" y2="23.222"><stop stop-color="#DA7ED0"></stop><stop offset=".08" stop-color="#B17BD5"></stop><stop offset=".19" stop-color="#8778DB"></stop><stop offset=".3" stop-color="#6276E1"></stop><stop offset=".41" stop-color="#4574E5"></stop><stop offset=".54" stop-color="#2E72E8"></stop><stop offset=".67" stop-color="#1D71EB"></stop><stop offset=".81" stop-color="#1471EC"></stop><stop offset="1" stop-color="#1171ED"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-azureai-fill-2" x1="18.404" x2="3.236" y1=".859" y2="25.183"><stop stop-color="#DA7ED0"></stop><stop offset=".05" stop-color="#B77BD4"></stop><stop offset=".11" stop-color="#9079DA"></stop><stop offset=".18" stop-color="#6E77DF"></stop><stop offset=".25" stop-color="#5175E3"></stop><stop offset=".33" stop-color="#3973E7"></stop><stop offset=".42" stop-color="#2772E9"></stop><stop offset=".54" stop-color="#1A71EB"></stop><stop offset=".68" stop-color="#1371EC"></stop><stop offset="1" stop-color="#1171ED"></stop></linearGradient></defs></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Hunyuan</title><g fill="none" fill-rule="evenodd"><circle cx="12" cy="12" fill="#0055E9" r="12"></circle><path d="M12 0c.518 0 1.028.033 1.528.096A6.188 6.188 0 0112.12 12.28l-.12.001c-2.99 0-5.242 2.179-5.554 5.11-.223 2.086.353 4.412 2.242 6.146C3.672 22.1 0 17.479 0 12 0 5.373 5.373 0 12 0z" fill="#A8DFF5"></path><path d="M5.286 5a2.438 2.438 0 01.682 3.38c-3.962 5.966-3.215 10.743 2.648 15.136C3.636 22.056 0 17.452 0 12c0-1.787.39-3.482 1.09-5.006.253-.435.525-.872.817-1.311A2.438 2.438 0 015.286 5z" fill="#0055E9"></path><path d="M12.98.04c.272.021.543.053.81.093.583.106 1.117.254 1.538.44 6.638 2.927 8.07 10.052 1.748 15.642a4.125 4.125 0 01-5.822-.358c-1.51-1.706-1.3-4.184.357-5.822.858-.848 3.108-1.223 4.045-2.441 1.257-1.634 2.122-6.009-2.523-7.506L12.98.039z" fill="#00BCFF"></path><path d="M13.528.096A6.187 6.187 0 0112 12.281a5.75 5.75 0 00-1.71.255c.147-.905.595-1.784 1.321-2.501.858-.848 3.108-1.223 4.045-2.441 1.27-1.651 2.14-6.104-2.676-7.554.184.014.367.033.548.056z" fill="#ECECEE"></path></g></svg></div>
        <div class="tokeness-provider-tile"><svg height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg" style="flex: 0 0 auto; line-height: 1;"><title>Xinference</title><path d="M5.223 9.692c.652 1.795 1.925 3.376 3.396 4.573 1.482 1.229 3.254 2.17 5.122 2.653a9.99 9.99 0 002.033.302c1.302.05 2.713-.206 3.758-1.04 1.297-1.036 1.651-2.625 1.318-4.21-.209-.993-.641-1.93-1.205-2.787a10.284 10.284 0 00-.366-.525.008.008 0 01.005-.007h.004c.002 0 .004 0 .006.002l.394.405a17.227 17.227 0 012.484 3.262c.579.993 1.023 2.046 1.255 3.144.369 1.747.07 3.546-1.306 4.777-.724.648-1.655 1.041-2.59 1.235-1.297.267-2.649.228-3.965.007-.669-.112-1.315-.26-1.937-.443-2.576-.756-5.012-2.051-7.143-3.677a20.968 20.968 0 01-3.484-3.296C1.949 12.813 1.046 11.396.487 9.853.12 8.845-.087 7.725.035 6.663c.267-2.306 1.98-3.654 4.174-4.06 1.265-.234 2.594-.186 3.879.037a17.71 17.71 0 013.978 1.192v.004a.006.006 0 01-.004.004h-.004a8.907 8.907 0 00-2.869-.29c-.807.048-1.666.263-2.357.656-1.034.588-1.67 1.463-1.907 2.625a4.567 4.567 0 00-.069 1.1c.025.58.163 1.198.367 1.761z" fill="url(#lobe-icons-xinference-fill-0)"></path><path d="M18.02 7.235a.05.05 0 01-.007.03c-.461.916-.923 1.832-1.386 2.747-.424.837-.745 1.437-.965 1.8a17.877 17.877 0 01-2.98 3.707.027.027 0 01-.03.005 12.678 12.678 0 01-4.205-2.777c-.14-.14-.28-.288-.42-.447a.024.024 0 01-.005-.013c0-.005 0-.01.003-.014a17.718 17.718 0 011.68-2.379 18.27 18.27 0 012.7-2.606c.408-.32 1.39-1.094 2.95-2.323L21.652.002a.008.008 0 01.01 0 .01.01 0 01.004.005.01.01 0 010 .006l-3.648 7.222z" fill="url(#lobe-icons-xinference-fill-1)"></path><path d="M2.027 24c.002 0 .004 0 .005-.002l5.843-4.58a.02.02 0 00.008-.017.02.02 0 00-.01-.016 26.743 26.743 0 01-2.584-1.842h-.006a.014.014 0 00-.005.002.012.012 0 00-.004.005L2.02 23.987a.01.01 0 000 .006c0 .002 0 .004.002.005a.009.009 0 00.006.002z" fill="url(#lobe-icons-xinference-fill-2)"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-xinference-fill-0" x1=".478" x2="22.985" y1="3.451" y2="19.698"><stop stop-color="#6F11F4"></stop><stop offset="1" stop-color="#AA66F1"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-xinference-fill-1" x1="21.676" x2="2.034" y1=".006" y2="23.987"><stop stop-color="#F52C77"></stop><stop offset="1" stop-color="#E9A45F" stop-opacity=".996"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-xinference-fill-2" x1="21.676" x2="2.034" y1=".006" y2="23.987"><stop stop-color="#F52C77"></stop><stop offset="1" stop-color="#E9A45F" stop-opacity=".996"></stop></linearGradient></defs></svg></div>
        <div class="tokeness-provider-tile tokeness-provider-more">30+</div>
      </div>
    </section>
    <section class="tokeness-footer">
      <div class="tokeness-block">
        <p class="tokeness-block-title">${t('footerRouteTitle')}</p>
        <div class="tokeness-list">
          <div class="tokeness-list-item"><i>01</i><span>${t('footerRoute01')}</span></div>
          <div class="tokeness-list-item"><i>02</i><span>${t('footerRoute02')}</span></div>
          <div class="tokeness-list-item"><i>03</i><span>${t('footerRoute03')}</span></div>
        </div>
      </div>
      <div class="tokeness-block">
        <p class="tokeness-block-title">${t('footerAdaptTitle')}</p>
        <div class="tokeness-spec-table">
          <div class="tokeness-spec-row"><span>SDK</span><strong>OpenAI / Claude / Gemini / Qwen</strong></div>
          <div class="tokeness-spec-row"><span>Routing</span><strong>${t('footerAdaptRouting')}</strong></div>
          <div class="tokeness-spec-row"><span>Output</span><strong>${t('footerAdaptOutput')}</strong></div>
          <div class="tokeness-spec-row"><span>Audit</span><strong>${t('footerAdaptAudit')}</strong></div>
        </div>
      </div>
    </section>
    <footer class="tokeness-site-footer">
      <div class="tokeness-site-footer-main">
        <div class="tokeness-footer-brand">Tokeness</div>
        <p class="tokeness-footer-copy">
          ${t('footerCopy')}
        </p>
        <p class="tokeness-footer-copyright">© 2026 Tokeness. All rights reserved.</p>
        <nav class="tokeness-footer-nav" aria-label="Tokeness footer navigation">
          <a class="tokeness-footer-link" href="/pricing">${t('footerModels')}</a>
          <a class="tokeness-footer-link" href="mailto:contact@tokeness.io">${t('footerContact')}</a>
        </nav>
      </div>
      <div class="tokeness-footer-right">
        <a class="tokeness-footer-badge" href="https://lmspeed.net/provider/tokeness-cn" target="_blank" rel="noopener">
          <img src="https://lmspeed.net/api/provider/claim-badge/1278?claim=1278--EDVRn1QWCO5Q_Feyad9cpuqsjUZVIb3" alt="Verified on LM Speed">
        </a>
        <nav class="tokeness-footer-legal" aria-label="Legal links">
          <a class="tokeness-footer-link" href="/privacy-policy">${t('footerPrivacy')}</a>
          <a class="tokeness-footer-link" href="/user-agreement">${t('footerTerms')}</a>
        </nav>
      </div>
    </footer>
  </div>
</section>`;
    }
    function log(msg, type = "info") {
        const prefix = "[Tokeness]";
        const styles = {
            info: "color: #d7192a; font-weight: bold;",
            warn: "color: #ff9800; font-weight: bold;",
            error: "color: #f44336; font-weight: bold;",
            success: "color: #4caf50; font-weight: bold;"
        };
        console.log(`%c${prefix} ${msg}`, styles[type] || styles.info);
    }
    function debounce(fn, delay) {
        return function (...args) {
            if (state.debounceTimer !== null)
                clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function mdToHtml(md) {
        return String(md)
            .replace(/^### (.*$)/gm, '<h4>$1</h4>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            .replace(/^· (.*$)/gm, '&bull; $1<br>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }
    function renderNotice() {
        const section = document.getElementById("tokeness-notice-section");
        if (!section)
            return;
        try {
            const noticeUrl = window.location.origin + "/api/notice";
            fetch(noticeUrl).then((r) => r.json()).then((json) => {
                let html = json && json.data ? json.data : "";
                if (html) {
                    html = mdToHtml(html);
                    section.innerHTML = "<p>" + html + "</p>";
                }
                else {
                    section.innerHTML = "";
                }
            }).catch(() => { });
        }
        catch (e) { }
    }
    function injectStyles() {
        try {
            if (document.getElementById("tokeness-home-style"))
                return;
            const styleEl = document.createElement("style");
            styleEl.id = "tokeness-home-style";
            styleEl.textContent = TOKENESS_HOME_STYLE;
            document.head.appendChild(styleEl);
            log("Styles injected", "success");
        }
        catch (err) {
            log(`Failed to inject styles: ${err.message}`, "error");
        }
    }
    function isHomePage() {
        const path = window.location.pathname;
        return path === "/" || path === "/index" || path === "/index.html";
    }
    function findMainContainer() {
        return document.querySelector(".bg-background.text-foreground");
    }
    function getHomeWrapperAnchor(mainContainer) {
        return mainContainer.children.length > 2 ? mainContainer.children[2] : null;
    }
    function doInject() {
        try {
            const mainContainer = findMainContainer();
            if (!mainContainer)
                return false;
            if (document.getElementById("tokeness-home-wrapper") && mainContainer.classList.contains("tokeness-hide-original")) {
                state.isInjected = true;
                return true;
            }
            currentLang = getNewApiLanguage();
            mainContainer.classList.add("tokeness-hide-original");
            let wrapper = document.getElementById("tokeness-home-wrapper");
            if (!wrapper) {
                wrapper = document.createElement("div");
                wrapper.id = "tokeness-home-wrapper";
                mainContainer.insertBefore(wrapper, getHomeWrapperAnchor(mainContainer));
            }
            wrapper.innerHTML = getTokenessHomeHTML();
            localizeMultilingualContent(wrapper);
            renderNotice();
            state.isInjected = true;
            log("Content injected", "success");
            return true;
        }
        catch (err) {
            log(`Inject failed: ${err.message}`, "error");
            return false;
        }
    }
    async function injectWithRetry() {
        if (state.isProcessing)
            return;
        state.isProcessing = true;
        state.retryCount = 0;
        while (state.retryCount < state.maxRetries) {
            if (doInject())
                break;
            state.retryCount++;
            log(`Retry ${state.retryCount}/${state.maxRetries}...`, "warn");
            await delay(state.retryDelay);
        }
        state.isProcessing = false;
    }
    function cleanup() {
        try {
            const wrapper = document.getElementById("tokeness-home-wrapper");
            if (wrapper)
                wrapper.remove();
            const mainContainer = findMainContainer();
            if (mainContainer)
                mainContainer.classList.remove("tokeness-hide-original");
            if (state.observer) {
                state.observer.disconnect();
                state.observer = null;
            }
            state.isInjected = false;
            log("Cleanup completed", "success");
        }
        catch (err) {
            log(`Cleanup failed: ${err.message}`, "error");
        }
    }
    function startObserver() {
        if (state.observer)
            state.observer.disconnect();
        const targetNode = document.body;
        if (!targetNode)
            return;
        state.observer = new MutationObserver(() => {
            localizeMultilingualContent(targetNode);
            if (getNewApiLanguage() !== currentLang) {
                scheduleLanguageRefresh();
            }
            else {
                enhanceRechargePage();
                enhancePaymentDialog();
                enhanceReferralPlan();
            }
            if (!isHomePage() || !state.isInjected)
                return;
            const wrapper = document.getElementById("tokeness-home-wrapper");
            if (!wrapper) {
                log("Wrapper removed, re-injecting", "warn");
                doInject();
                return;
            }
            const mainContainer = findMainContainer();
            if (mainContainer && !mainContainer.classList.contains("tokeness-hide-original")) {
                mainContainer.classList.add("tokeness-hide-original");
            }
        });
        state.observer.observe(targetNode, { childList: true, subtree: true });
        log("MutationObserver started");
    }
    function getPayableContainer(customAmountInput) {
        const nextElement = customAmountInput.nextElementSibling;
        if (nextElement && nextElement.id === "tokeness-recharge-note") {
            nextElement.remove();
            return customAmountInput.nextElementSibling;
        }
        return nextElement;
    }
    function setPayableText(payableContainer, textContent) {
        const textTarget = payableContainer.lastElementChild || payableContainer;
        textTarget.classList.add("tokeness-payable-amount-target");
        if (textTarget.dataset.tokenessPayableText !== textContent) {
            textTarget.dataset.tokenessPayableText = textContent;
        }
        textTarget.style.color = "transparent";
        textTarget.style.webkitTextFillColor = "transparent";
        textTarget.style.position = "relative";
        textTarget.style.display = "inline-flex";
        textTarget.style.minWidth = `${Math.max(4, textContent.length)}ch`;
    }
    function updatePayableDisplay() {
        const customAmountInput = document.getElementById("topup-amount");
        if (!customAmountInput)
            return;
        if (!(customAmountInput instanceof HTMLInputElement))
            return;
        const payableContainer = getPayableContainer(customAmountInput);
        if (!payableContainer)
            return;
        const validPrice = getExchangeRate();
        const inputValue = Number(customAmountInput.value);
        const validAmount = Number.isFinite(inputValue) && inputValue > 0 ? inputValue : 0;
        const total = validAmount * validPrice;
        const textContent = usesChineseRechargeText(customAmountInput)
            ? `¥${total.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`
            : `${total.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} CNY`;
        setPayableText(payableContainer, textContent);
    }
    function findPaymentDialogRow(dialog, labels) {
        const rows = Array.from(dialog.querySelectorAll("div"));
        return rows.find((row) => {
            const label = row.firstElementChild;
            const labelText = label && label.textContent ? label.textContent.trim() : "";
            return labels.includes(labelText) && row.children.length >= 2;
        }) || null;
    }
    function stripTextLabels(value, labels) {
        return labels.reduce((text, label) => text.replace(label, ""), value).trim();
    }
    function getPaymentDialogMethodName(methodRow) {
        if (!methodRow)
            return "";
        const leafTexts = Array.from(methodRow.querySelectorAll("*"))
            .filter((element) => element.children.length === 0)
            .map((element) => element.textContent.trim())
            .filter(Boolean)
            .filter((text) => !PAYMENT_DIALOG_METHOD_LABELS.includes(text));
        return leafTexts[leafTexts.length - 1] || stripTextLabels(methodRow.textContent || "", PAYMENT_DIALOG_METHOD_LABELS);
    }
    function enhancePaymentDialog() {
        const dialogs = Array.from(document.querySelectorAll('[class*="alert-dialog-content"], [role="alertdialog"], [role="dialog"]'));
        for (const dialog of dialogs) {
            const dialogText = dialog.textContent || "";
            if (!PAYMENT_DIALOG_TITLE_LABELS.some((label) => dialogText.includes(label)))
                continue;
            const payRow = findPaymentDialogRow(dialog, PAYMENT_DIALOG_PAY_LABELS);
            if (!payRow)
                continue;
            const methodRow = findPaymentDialogRow(dialog, PAYMENT_DIALOG_METHOD_LABELS);
            const methodText = getPaymentDialogMethodName(methodRow);
            const isEpay = isEpayPaymentMethodName(methodText);
            payRow.classList.toggle("tokeness-payment-dialog-hidden-row", !isEpay);
            payRow.classList.toggle("tokeness-payment-dialog-epay-notice-row", isEpay);
            if (isEpay) {
                const epayNotice = walletCopy().epayNotice;
                if (payRow.dataset.tokenessEpayNotice !== epayNotice) {
                    payRow.dataset.tokenessEpayNotice = epayNotice;
                }
            }
            else if (payRow.dataset.tokenessEpayNotice) {
                delete payRow.dataset.tokenessEpayNotice;
            }
        }
    }
    function watchPaymentDialogTriggers() {
        if (state.paymentDialogWatcherStarted)
            return;
        state.paymentDialogWatcherStarted = true;
        document.addEventListener("click", () => {
            setTimeout(enhancePaymentDialog, 0);
            setTimeout(enhancePaymentDialog, 100);
            setTimeout(enhancePaymentDialog, 300);
        }, true);
    }
    function findTextElement(text) {
        if (!document.body)
            return null;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            if ((node.nodeValue || "").trim() === text)
                return node.parentElement;
            node = walker.nextNode();
        }
        return null;
    }
    function findAnyTextElement(texts) {
        for (const text of texts) {
            const element = findTextElement(text);
            if (element)
                return element;
        }
        return null;
    }
    function includesEveryLabelGroup(textContent, labelGroups) {
        return labelGroups.every((labels) => labels.some((label) => textContent.includes(label)));
    }
    function hideTransferToBalanceButton(cardGrid) {
        const buttons = Array.from(cardGrid.querySelectorAll("button, a, [role='button']"));
        for (const button of buttons) {
            const text = button.textContent ? button.textContent.trim() : "";
            const shouldHide = TRANSFER_TO_BALANCE_LABELS.some((label) => text === label || text.includes(label));
            button.classList.toggle("tokeness-referral-transfer-hidden", shouldHide);
        }
    }
    function enhanceReferralPlan() {
        const title = findAnyTextElement(REFERRAL_TITLES);
        if (!title)
            return;
        const copyText = walletCopy().referralCopy;
        const infoBlock = title.closest("div") || title.parentElement;
        const copy = infoBlock && infoBlock.querySelector("p");
        if (copy) {
            copy.classList.add("tokeness-referral-copy");
            if (copy.textContent !== copyText) {
                copy.textContent = copyText;
            }
        }
        const cardGrid = title.closest("[class*='grid']");
        if (!cardGrid)
            return;
        hideTransferToBalanceButton(cardGrid);
        const statsGrid = Array.from(cardGrid.querySelectorAll("div"))
            .find((element) => includesEveryLabelGroup(element.textContent || "", REFERRAL_STAT_LABEL_GROUPS));
        if (!statsGrid)
            return;
        statsGrid.classList.add("tokeness-referral-stats");
        for (const stat of Array.from(statsGrid.children)) {
            const label = stat.firstElementChild && stat.firstElementChild.textContent.trim();
            const shouldHide = Boolean(label && REFERRAL_HIDDEN_STAT_LABELS.includes(label));
            if (stat.classList.contains("tokeness-referral-hidden-stat") !== shouldHide) {
                stat.classList.toggle("tokeness-referral-hidden-stat", shouldHide);
            }
        }
    }
    function enhanceRechargePage() {
        const path = window.location.pathname;
        const existingNote = document.getElementById("tokeness-recharge-note");
        if (!path.includes("/wallet") && !path.includes("/topup") && !path.includes("/recharge")) {
            if (existingNote)
                existingNote.remove();
            return;
        }
        const customAmountInput = document.getElementById("topup-amount");
        if (!customAmountInput) {
            if (existingNote)
                existingNote.remove();
            return;
        }
        const price = getExchangeRate();
        if (existingNote)
            existingNote.remove();
        const formattedPrice = price.toLocaleString("zh-CN");
        const textContent = usesChineseRechargeText(customAmountInput)
            ? `×¥${formattedPrice}=`
            : `×${formattedPrice} CNY =`;
        const insertParent = customAmountInput.parentElement;
        if (!insertParent)
            return;
        const payableContainer = getPayableContainer(customAmountInput);
        if (!payableContainer)
            return;
        insertParent.classList.add("tokeness-recharge-row");
        insertParent.dataset.tokenessRechargeNote = textContent;
        if (insertParent.classList.contains("grid")) {
            insertParent.style.gridTemplateColumns = "minmax(0, 1fr) auto minmax(110px, 0.55fr)";
            insertParent.style.alignItems = "center";
        }
        customAmountInput.style.gridColumn = "1";
        customAmountInput.style.gridRow = "1";
        payableContainer.style.gridColumn = "3";
        payableContainer.style.gridRow = "1";
        if (customAmountInput.dataset.tokenessInputListener !== "true") {
            customAmountInput.addEventListener("input", updatePayableDisplay);
            customAmountInput.addEventListener("change", updatePayableDisplay);
            customAmountInput.dataset.tokenessInputListener = "true";
        }
        updatePayableDisplay();
    }
    function handleRouteChange() {
        const debouncedHandler = debounce(() => {
            log(`Route changed: ${window.location.pathname}`);
            enhanceRechargePage();
            enhancePaymentDialog();
            enhanceReferralPlan();
            if (isHomePage()) {
                injectWithRetry().then(() => {
                    if (state.isInjected)
                        startObserver();
                });
            }
            else {
                cleanup();
                // startObserver is needed on non-home pages as well to detect route changes via history API properly
                // since we cleared the wrapper, we just need to ensure observer runs enhanceRechargePage
                startObserver();
            }
        }, 150);
        debouncedHandler();
    }
    function watchRouteChanges() {
        window.addEventListener("popstate", handleRouteChange);
        const origPush = history.pushState;
        const origReplace = history.replaceState;
        history.pushState = function (data, unused, url) {
            origPush.call(this, data, unused, url);
            handleRouteChange();
        };
        history.replaceState = function (data, unused, url) {
            origReplace.call(this, data, unused, url);
            handleRouteChange();
        };
        window.addEventListener("hashchange", handleRouteChange);
        log("Route watchers initialized");
    }
    async function init() {
        log("Initializing...");
        watchAnnouncementApis();
        watchNewApiLanguage();
        watchPaymentDialogTriggers();
        applyLocalizedHeadContent();
        watchHeadContent();
        injectStyles();
        enhanceRechargePage();
        enhancePaymentDialog();
        enhanceReferralPlan();
        if (isHomePage()) {
            await injectWithRetry();
        }
        // Always start observer so enhanceRechargePage can run on route changes/mutations
        startObserver();
        watchRouteChanges();
        log("Initialized", "success");
    }
    watchAnnouncementApis();
    watchNewApiLanguage();
    applyLocalizedHeadContent();
    watchHeadContent();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }
})();
