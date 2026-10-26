// src/api/endpoints.ts
export const ENDPOINTS = {
    auth: {
      login: "/auth/login",
      refresh: "/auth/refresh",
      logout: "/auth/logout",
      me: "/auth/me",

      // Password reset
      passwordForgot: "/auth/password/forgot",
      passwordReset: "/auth/password/reset",

      // Phone login (passwordless)
      phoneStart: "/auth/phone/start",
      phoneVerify: "/auth/phone/verify",

      // MFA
      mfaFinalize: "/auth/mfa/finalize",

      // 2FA management
      twofaSetup: "/auth/2fa/setup",
      twofaEnable: "/auth/2fa/enable",
      twofaDisable: "/auth/2fa/disable",
      twofaSmsStart: "/auth/2fa/sms/start",
      twofaSmsConfirm: "/auth/2fa/sms/confirm",
      recoveryGenerate: "/auth/2fa/recovery/generate",
      recoveryVerify: "/auth/2fa/recovery/verify",
    },

    admin: {
      overview: "/admin/overview",
  
      account: {
        me: "/admin/account/me",
        profile: "/admin/account/profile",
        emailChangeRequest: "/admin/account/email-change/request",
        emailChangeConfirm: "/admin/account/email-change/confirm",

        // Security
        sessions: "/admin/account/sessions",
        revokeSession: (id: string) => `/admin/account/sessions/${id}/revoke`,
        revokeOthers: "/admin/account/sessions/revoke-others",
        securityEvents: "/admin/account/security-events",
      },
  
      settings: {
        base: "/admin/settings",
        linkNavs: "/admin/settings/link-navs",
        revisions: "/admin/settings/revisions",
        revision: (id: string) => `/admin/settings/revisions/${id}`,
        restoreRevision: (id: string) => `/admin/settings/revisions/${id}/restore`,
      },

      // Team & permissions
      staff: {
        permissions: "/admin/staff/permissions",
        roles: "/admin/staff/roles",
        role: (id: string) => `/admin/staff/roles/${id}`,
        members: "/admin/staff/members",
        member: (id: string) => `/admin/staff/members/${id}`,
        memberLink: (id: string) => `/admin/staff/members/${id}/link`,
        memberRevokeSessions: (id: string) => `/admin/staff/members/${id}/sessions/revoke`,
      },
      activity: "/admin/activity",

      // Shopper accounts
      customers: "/admin/customers",
      customer: (id: string) => `/admin/customers/${id}`,

      // Server & sign-in rules
      systemSecurity: "/admin/system/security",
      systemBackups: {
        base: "/admin/system/backups",
        run: "/admin/system/backups/run",
        download: "/admin/system/backups/download",
        link: (id: string) => `/admin/system/backups/${id}/link`,
      },
      systemTraffic: {
        base: "/admin/system/traffic",
        blocks: "/admin/system/traffic/blocks",
        block: (id: string) => `/admin/system/traffic/blocks/${id}`,
        forgive: "/admin/system/traffic/forgive",
      },
      // The video library and upload settings (الوسائط → الفيديوهات)
      // 360° scans of products from a filmed turn (مسح 3D)
      mediaScans: {
        base: "/admin/media/scans",
        one: (id: string) => `/admin/media/scans/${id}`,
      },
      // The store's own 3D models (.glb) for a gaming theme's stage (محرّر المشهد)
      mediaModels: {
        base: "/admin/media/models",
        sign: "/admin/media/models/sign",
        local: "/admin/media/models/local",
        one: (id: string) => `/admin/media/models/${id}`,
      },
      mediaVideos: {
        base: "/admin/media/videos",
        settings: "/admin/media/videos/settings",
        sign: "/admin/media/videos/sign",
        local: "/admin/media/videos/local",
        one: (id: string) => `/admin/media/videos/${id}`,
        usage: (id: string) => `/admin/media/videos/${id}/usage`,
        renditions: (id: string) => `/admin/media/videos/${id}/renditions`,
        rendition: (id: string, rid: string) => `/admin/media/videos/${id}/renditions/${rid}`,
        frames: (id: string) => `/admin/media/videos/${id}/frames`,
      },
      // Speed monitor and request lanes (مراقبة السرعة والأولوية)
      systemSpeed: {
        base: "/admin/system/speed",
        live: "/admin/system/speed/live",
        reset: "/admin/system/speed/reset",
        resetStats: "/admin/system/speed/reset-stats",
        rum: "/admin/system/speed/rum",
        indexes: "/admin/system/speed/indexes",
      },
      // Background jobs (المهام بالخلفية)
      systemJobs: {
        base: "/admin/system/jobs",
        run: (name: string) => `/admin/system/jobs/${encodeURIComponent(name)}/run`,
      },
      // Speed & cache (السرعة والكاش)
      systemCache: {
        base: "/admin/system/cache",
        live: "/admin/system/cache/live",
        reset: "/admin/system/cache/reset",
        purge: "/admin/system/cache/purge",
        popular: "/admin/system/cache/popular",
        warm: "/admin/system/cache/warm",
        restore: (id: string) => `/admin/system/cache/revisions/${id}/restore`,
      },
      systemSecurityReset: "/admin/system/security/reset",
      systemSecurityRestore: (id: string) => `/admin/system/security/revisions/${id}/restore`,
      nav: {
        base: "/admin/nav",
        menus: "/admin/nav/menus",
        menuById: (id: string) => `/admin/nav/menus/${id}`,
        items: "/admin/nav/items",
        itemById: (id: string) => `/admin/nav/items/${id}`,
        moveItem: (id: string) => `/admin/nav/items/${id}/move`,
      },
      pages: {
        base: "/admin/pages",
        byId: (id: string) => `/admin/pages/${id}`,
        revisions: (id: string) => `/admin/pages/${id}/revisions`,
        restoreRevision: (id: string, revisionId: string) => `/admin/pages/${id}/revisions/${revisionId}/restore`,
        sections: (pageId: string) => `/admin/pages/${pageId}/sections`,
        sectionById: (sectionId: string) => `/admin/pages/sections/${sectionId}`,
        moveSection: (sectionId: string) => `/admin/pages/sections/${sectionId}/move`,
        tree: (id: string) => `/admin/pages/${id}/tree`,
        format: (id: string) => `/admin/pages/${id}/format`,
        previewToken: (id: string) => `/admin/pages/${id}/preview-token`,
        draft: (id: string) => `/admin/pages/${id}/draft`,
        draftOps: (id: string) => `/admin/pages/${id}/draft/ops`,
        draftPublish: (id: string) => `/admin/pages/${id}/draft/publish`,
        validateSection: "/admin/pages/sections/validate",
        aiSuggestSections: "/admin/pages/ai/suggest-sections",
        aiTranslate: "/admin/pages/ai/translate",
        aiImproveSeo: "/admin/pages/ai/improve-seo",
        i18n: (id: string, locale: string) => `/admin/pages/${id}/i18n/${locale}`,
      },
      audit: {
        events: "/admin/audit/events",
      },
      uploads: {
        images: "/admin/uploads/images",
        imageById: (id: string) => `/admin/uploads/images/${id}`,
        imageUsage: (id: string) => `/admin/uploads/images/${id}/usage`,
        imagesBulk: "/admin/uploads/images/bulk",
        imageFolders: "/admin/uploads/images/folders",
        imageFolderById: (id: string) => `/admin/uploads/images/folders/${id}`,
        imageTags: "/admin/uploads/images/tags",
        imageDuplicates: "/admin/uploads/images/duplicates",
        // «شيل الخلفية» with Cloudinary (GET: is it switched on; POST: the cut-out PNG)
        backgroundRemoval: "/admin/uploads/background-removal",
      },

      // One history for everything (السجل)
      history: {
        base: "/admin/history",
        restore: "/admin/history/restore",
      },
      // Automations (التلقائيات) and the bell
      automations: {
        base: "/admin/automations",
        one: (id: string) => `/admin/automations/${encodeURIComponent(id)}`,
        test: (id: string) => `/admin/automations/${encodeURIComponent(id)}/test`,
      },
      notifications: {
        base: "/admin/notifications",
        read: "/admin/notifications/read",
      },
      // The timeline (الجدول الزمني)
      schedule: {
        base: "/admin/schedule",
        options: "/admin/schedule/options",
        preview: "/admin/schedule/preview",
        one: (id: string) => `/admin/schedule/${encodeURIComponent(id)}`,
        cancel: (id: string) => `/admin/schedule/${encodeURIComponent(id)}/cancel`,
        run: (id: string) => `/admin/schedule/${encodeURIComponent(id)}/run`,
        undo: (id: string) => `/admin/schedule/${encodeURIComponent(id)}/undo`,
      },
      // A/B tests (تجارب A/B)
      experiments: {
        base: "/admin/experiments",
        one: (id: string) => `/admin/experiments/${encodeURIComponent(id)}`,
        start: (id: string) => `/admin/experiments/${encodeURIComponent(id)}/start`,
        stop: (id: string) => `/admin/experiments/${encodeURIComponent(id)}/stop`,
        keep: (id: string) => `/admin/experiments/${encodeURIComponent(id)}/keep`,
      },
      // Smart selling: sale rules and seasons (البيع الذكي)
      selling: {
        suggestions: "/admin/selling/suggestions",
        rules: "/admin/selling/rules",
        approve: "/admin/selling/suggestions/approve",
        skip: "/admin/selling/suggestions/skip",
        actions: "/admin/selling/actions",
        undo: (id: string) => `/admin/selling/actions/${encodeURIComponent(id)}/undo`,
        campaigns: "/admin/selling/campaigns",
        campaignPreview: "/admin/selling/campaigns/preview",
        campaign: (id: string) => `/admin/selling/campaigns/${encodeURIComponent(id)}`,
        campaignEnd: (id: string) => `/admin/selling/campaigns/${encodeURIComponent(id)}/end`,
      },
      // Smart selling (توقّع المخزون)
      insights: {
        stock: "/admin/insights/stock",
        stockSettings: "/admin/insights/stock/settings",
      },
      inventory: {
        lowStock: "/admin/inventory/low-stock",
        adjustments: "/admin/inventory/adjustments",
        variantAdjust: (variantId: string) => `/admin/inventory/variants/${variantId}/adjust`,
        variantThreshold: (variantId: string) => `/admin/inventory/variants/${variantId}/threshold`,
        variants: "/admin/inventory/variants",
        bulk: "/admin/inventory/bulk",
      },
      features: {
        base: "/admin/features",
        byKey: (key: string) => `/admin/features/${key}`,
      },
      stockAlerts: {
        base: "/admin/stock-alerts",
        sendNow: "/admin/stock-alerts/send-now",
        byId: (id: string) => `/admin/stock-alerts/${id}`,
      },
      catalog: {
        base: "/admin/catalog",
      
        categories: {
          base: "/admin/catalog/categories",
          byId: (id: string) => `/admin/catalog/categories/${id}`,
        },
      
        products: {
          base: "/admin/catalog/products",
          byId: (id: string) => `/admin/catalog/products/${id}`,
          full: (id: string) => `/admin/catalog/products/${id}/full`,
          archive: (id: string) => `/admin/catalog/products/${id}/archive`,
          bulk: "/admin/catalog/products/bulk",
          import: "/admin/catalog/products/import",
        },
      
        productFiles: (productId: string) => `/admin/catalog/products/${productId}/files`,
        productCodes: (productId: string) => `/admin/catalog/products/${productId}/codes`,
        productProtected: (productId: string) => `/admin/catalog/products/${productId}/protected`,
        protectedTypes: "/admin/catalog/protected-types",

        productTypes: {
          base: "/admin/catalog/product-types",
          byId: (id: string) => `/admin/catalog/product-types/${id}`,
        },

        sizes: {
          base: "/admin/catalog/sizes",
          byId: (id: string) => `/admin/catalog/sizes/${id}`,
        },
      
        items: {
          base: "/admin/catalog/items",
          byId: (id: string) => `/admin/catalog/items/${id}`,
        },
      
        variants: {
          base: "/admin/catalog/variants",
          byId: (id: string) => `/admin/catalog/variants/${id}`,
        },
      
        images: {
          base: "/admin/catalog/images",
          byId: (id: string) => `/admin/catalog/images/${id}`,
        },
      },
  
      coupons: {
        base: "/admin/coupons",
        byId: (id: string) => `/admin/coupons/${id}`,
      },

      orders: {
        base: "/admin/orders",
        byId: (id: string) => `/admin/orders/${id}`,
        invoice: (id: string) => `/admin/orders/${id}/invoice`,
        status: (id: string) => `/admin/orders/${id}/status`,
        message: (id: string) => `/admin/orders/${id}/message`,
        delivery: (id: string) => `/admin/orders/${id}/delivery`,
        protectedTrace: "/admin/orders/protected-trace",
      },

      tickets: {
        base: "/admin/tickets",
        events: "/admin/tickets/events",
        byCode: (code: string) => `/admin/tickets/code/${encodeURIComponent(code)}`,
        checkIn: (id: string) => `/admin/tickets/${id}/check-in`,
        undo: (id: string) => `/admin/tickets/${id}/undo`,
      },
  
      outbox: {
        base: "/admin/outbox",
        byId: (id: string) => `/admin/outbox/${id}`,
        retry: (id: string) => `/admin/outbox/${id}/retry`,
        cancel: (id: string) => `/admin/outbox/${id}/cancel`,
        process: "/admin/outbox/process",
      },
  
      ugc: {
        reviews: "/admin/ugc/reviews",
        reviewStatus: (id: string) => `/admin/ugc/reviews/${id}/status`,
        reviewById: (id: string) => `/admin/ugc/reviews/${id}`,
  
        comments: "/admin/ugc/comments",
        commentStatus: (id: string) => `/admin/ugc/comments/${id}/status`,
        commentById: (id: string) => `/admin/ugc/comments/${id}`,
      },

      chatbot: {
        entries: "/admin/chatbot/entries",
        entryById: (id: string) => `/admin/chatbot/entries/${id}`,
        conversations: "/admin/chatbot/conversations",
        conversationById: (id: string) => `/admin/chatbot/conversations/${id}`,
      },
      
    },
  } as const;
  
