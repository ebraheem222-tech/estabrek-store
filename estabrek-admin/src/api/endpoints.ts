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
      mfaTokensFromSession: "/auth/mfa/tokens-from-session",

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
      },
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
        sections: (pageId: string) => `/admin/pages/${pageId}/sections`,
        sectionById: (sectionId: string) => `/admin/pages/sections/${sectionId}`,
        moveSection: (sectionId: string) => `/admin/pages/sections/${sectionId}/move`,
        aiSuggestSections: "/admin/pages/ai/suggest-sections",
        aiTranslate: "/admin/pages/ai/translate",
        aiImproveSeo: "/admin/pages/ai/improve-seo",
        i18n: (id: string, locale: string) => `/admin/pages/${id}/i18n/${locale}`,
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
      },

      inventory: {
        lowStock: "/admin/inventory/low-stock",
        adjustments: "/admin/inventory/adjustments",
        variantAdjust: (variantId: string) => `/admin/inventory/variants/${variantId}/adjust`,
        variantThreshold: (variantId: string) => `/admin/inventory/variants/${variantId}/threshold`,
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
  
