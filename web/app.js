/* ============================================================
   schema.seoryon.com — Schema & FAQ Generator.
   100% client-side. No backend, no API, no network request. Nothing
   you type is uploaded, stored, or transmitted. The only persisted
   state is your language + last-used type (localStorage), like
   score / roi / inspect / cite.

   Languages: EN (default, source) · DE (informal "du") · FR
   (vouvoiement). All UI chrome — type names, field labels, hints,
   buttons, validation, copy — is natively localized. The generated
   JSON-LD *field keys* stay in English because that is the schema.org
   specification, not a translation choice. Users' input values are
   theirs, untouched.

   Honesty:
   - No "rich snippets in Google" promise anywhere. Google restricted
     FAQ rich results to gov/health in 2023 and removed them for all
     sites in May 2026. The value framed here is
     (1) AI citation / GEO and (2) valid, clean structured data.
   Correctness & safety:
   - Field templates follow schema.org type definitions and Google's
     documented required/recommended fields. Reimplemented in our own
     code (no third-party brand or code shipped).
   - Output is escaped so a value like </script>, quotes, or <> can
     never break the JSON-LD or inject markup: <>& and U+2028/2029 are
     turned into \uXXXX escapes, which stay valid JSON.
   ============================================================ */
(() => {
  "use strict";

  const SUPPORTED = ["en", "de", "fr"];
  const STORAGE_LANG = "seoryon_schema_lang";
  const STORAGE_TYPE = "seoryon_schema_type";

  /* ============================================================
     Value helpers
     ============================================================ */
  const u = (v) => {
    const s = (v == null ? "" : String(v)).trim();
    return s === "" ? undefined : s;
  };
  // Recursively drop undefined / "" / empty arrays. Nested objects that
  // end up with only "@type" are dropped entirely (e.g. an author with no
  // name). The top-level object is always kept.
  const clean = (x, top) => {
    if (Array.isArray(x)) {
      const a = x.map((v) => clean(v, false)).filter((v) => v !== undefined);
      return a.length ? a : undefined;
    }
    if (x && typeof x === "object") {
      const o = {};
      let real = 0;
      for (const k in x) {
        const v = clean(x[k], false);
        if (v === undefined) continue;
        o[k] = v;
        if (k !== "@type" && k !== "@context") real++;
      }
      if (!top && real === 0) return undefined;
      return o;
    }
    if (typeof x === "string") return x === "" ? undefined : x;
    return x;
  };

  const person = (name, url, extra) => u(name) ? Object.assign({ "@type": "Person", name: u(name), url: u(url) }, extra || {}) : undefined;
  const address = (s, p) => {
    const a = {
      "@type": "PostalAddress",
      streetAddress: u(s[p + "street"]),
      addressLocality: u(s[p + "locality"]),
      addressRegion: u(s[p + "region"]),
      postalCode: u(s[p + "postal"]),
      addressCountry: u(s[p + "country"]),
    };
    return (a.streetAddress || a.addressLocality || a.addressRegion || a.postalCode || a.addressCountry) ? a : undefined;
  };
  const imageObj = (url) => u(url) ? { "@type": "ImageObject", url: u(url) } : undefined;

  const CTX = "https://schema.org";

  /* ============================================================
     Schema type + field templates (data-driven).
     kind: text | textarea | url | number | date | datetime | time | select | repeat
     req:  required per schema.org / Google
     label/help/ph: i18n keys (resolved against the active dictionary)
     Shared label keys (fl_*) are reused across types to keep the
     dictionary compact.
     ============================================================ */
  const DAY_OPTS = [
    { v: "https://schema.org/Monday", l: "day_mon" },
    { v: "https://schema.org/Tuesday", l: "day_tue" },
    { v: "https://schema.org/Wednesday", l: "day_wed" },
    { v: "https://schema.org/Thursday", l: "day_thu" },
    { v: "https://schema.org/Friday", l: "day_fri" },
    { v: "https://schema.org/Saturday", l: "day_sat" },
    { v: "https://schema.org/Sunday", l: "day_sun" },
  ];
  const CURRENCY_OPTS = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "SEK", "PLN"].map((c) => ({ v: c }));

  const TYPES = [
    {
      key: "FAQPage", hero: true, badge: "chip_geo",
      fields: [
        {
          k: "qa", kind: "repeat", req: true, min: 2, add: "add_qa", item: "item_qa",
          sub: [
            { k: "question", kind: "text", req: true, label: "fl_question", ph: "ph_question" },
            { k: "answer", kind: "textarea", req: true, label: "fl_answer", ph: "ph_answer" },
          ],
        },
      ],
      build(s, g) {
        const items = (g.qa || []).map((x) => ({ q: u(x.question), a: u(x.answer) })).filter((x) => x.q && x.a);
        return {
          "@context": CTX, "@type": "FAQPage",
          mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
        };
      },
    },

    {
      key: "Article",
      fields: [
        { k: "articleType", kind: "select", label: "fl_articleType", options: [{ v: "Article" }, { v: "BlogPosting" }, { v: "NewsArticle" }] },
        { k: "headline", kind: "text", req: true, label: "fl_headline", ph: "ph_headline" },
        { k: "description", kind: "textarea", label: "fl_description", ph: "ph_description" },
        { k: "image", kind: "url", label: "fl_image", ph: "ph_url", help: "help_image" },
        { k: "authorName", kind: "text", req: true, label: "fl_authorName", ph: "ph_person" },
        { k: "authorUrl", kind: "url", label: "fl_authorUrl", ph: "ph_url" },
        { k: "publisherName", kind: "text", req: true, label: "fl_publisherName", ph: "ph_org" },
        { k: "publisherLogo", kind: "url", label: "fl_publisherLogo", ph: "ph_url", help: "help_logo" },
        { k: "datePublished", kind: "date", req: true, label: "fl_datePublished" },
        { k: "dateModified", kind: "date", label: "fl_dateModified" },
        { k: "url", kind: "url", label: "fl_pageUrl", ph: "ph_url", help: "help_pageurl" },
      ],
      build(s) {
        return {
          "@context": CTX, "@type": u(s.articleType) || "Article",
          headline: u(s.headline),
          description: u(s.description),
          image: u(s.image),
          author: person(s.authorName, s.authorUrl),
          publisher: u(s.publisherName) ? { "@type": "Organization", name: u(s.publisherName), logo: imageObj(s.publisherLogo) } : undefined,
          datePublished: u(s.datePublished),
          dateModified: u(s.dateModified),
          mainEntityOfPage: u(s.url) ? { "@type": "WebPage", "@id": u(s.url) } : undefined,
        };
      },
    },

    {
      key: "Organization",
      fields: [
        { k: "name", kind: "text", req: true, label: "fl_orgName", ph: "ph_org" },
        { k: "url", kind: "url", req: true, label: "fl_url", ph: "ph_url" },
        { k: "logo", kind: "url", label: "fl_logo", ph: "ph_url", help: "help_logo" },
        { k: "description", kind: "textarea", label: "fl_description", ph: "ph_org_desc" },
        { k: "telephone", kind: "text", label: "fl_telephone", ph: "ph_tel" },
        { k: "email", kind: "text", label: "fl_email", ph: "ph_email" },
        { k: "_addr", kind: "subhead", label: "sub_address" },
        { k: "street", kind: "text", label: "fl_street", ph: "ph_street" },
        { k: "locality", kind: "text", label: "fl_locality", ph: "ph_locality" },
        { k: "region", kind: "text", label: "fl_region", ph: "ph_region" },
        { k: "postal", kind: "text", label: "fl_postal", ph: "ph_postal" },
        { k: "country", kind: "text", label: "fl_country", ph: "ph_country" },
        {
          k: "sameAs", kind: "repeat", min: 1, add: "add_sameAs", item: "item_sameAs", help: "help_sameAs",
          sub: [{ k: "url", kind: "url", label: "fl_profileUrl", ph: "ph_profile" }],
        },
      ],
      build(s, g) {
        return {
          "@context": CTX, "@type": "Organization",
          name: u(s.name), url: u(s.url), logo: u(s.logo),
          description: u(s.description), telephone: u(s.telephone), email: u(s.email),
          address: address(s, ""),
          sameAs: (g.sameAs || []).map((x) => u(x.url)).filter(Boolean),
        };
      },
    },

    {
      key: "LocalBusiness",
      fields: [
        { k: "bizType", kind: "select", label: "fl_bizType", options: [
          { v: "LocalBusiness", l: "biz_generic" }, { v: "Restaurant", l: "biz_restaurant" }, { v: "Store", l: "biz_store" },
          { v: "CafeOrCoffeeShop", l: "biz_cafe" }, { v: "ProfessionalService", l: "biz_prof" }, { v: "MedicalBusiness", l: "biz_medical" },
        ] },
        { k: "name", kind: "text", req: true, label: "fl_bizName", ph: "ph_bizname" },
        { k: "image", kind: "url", req: true, label: "fl_image", ph: "ph_url", help: "help_bizimage" },
        { k: "telephone", kind: "text", label: "fl_telephone", ph: "ph_tel" },
        { k: "url", kind: "url", label: "fl_url", ph: "ph_url" },
        { k: "priceRange", kind: "text", label: "fl_priceRange", ph: "ph_pricerange", help: "help_pricerange" },
        { k: "_addr", kind: "subhead", label: "sub_address" },
        { k: "street", kind: "text", req: true, label: "fl_street", ph: "ph_street" },
        { k: "locality", kind: "text", req: true, label: "fl_locality", ph: "ph_locality" },
        { k: "region", kind: "text", label: "fl_region", ph: "ph_region" },
        { k: "postal", kind: "text", label: "fl_postal", ph: "ph_postal" },
        { k: "country", kind: "text", label: "fl_country", ph: "ph_country" },
        { k: "_geo", kind: "subhead", label: "sub_geo", help: "help_geo" },
        { k: "lat", kind: "number", label: "fl_lat", ph: "ph_lat" },
        { k: "long", kind: "number", label: "fl_long", ph: "ph_long" },
        {
          k: "hours", kind: "repeat", min: 1, add: "add_hours", item: "item_hours", help: "help_hours",
          sub: [
            { k: "day", kind: "select", label: "fl_day", options: DAY_OPTS },
            { k: "opens", kind: "time", label: "fl_opens" },
            { k: "closes", kind: "time", label: "fl_closes" },
          ],
        },
      ],
      build(s, g) {
        const geo = (u(s.lat) && u(s.long)) ? { "@type": "GeoCoordinates", latitude: u(s.lat), longitude: u(s.long) } : undefined;
        const hours = (g.hours || [])
          .filter((x) => u(x.day) && (u(x.opens) || u(x.closes)))
          .map((x) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: u(x.day), opens: u(x.opens), closes: u(x.closes) }));
        return {
          "@context": CTX, "@type": u(s.bizType) || "LocalBusiness",
          name: u(s.name), image: u(s.image), telephone: u(s.telephone), url: u(s.url), priceRange: u(s.priceRange),
          address: address(s, ""), geo,
          openingHoursSpecification: hours,
        };
      },
    },

    {
      key: "Product",
      fields: [
        { k: "name", kind: "text", req: true, label: "fl_productName", ph: "ph_product" },
        { k: "image", kind: "url", req: true, label: "fl_image", ph: "ph_url", help: "help_prodimage" },
        { k: "description", kind: "textarea", label: "fl_description", ph: "ph_product_desc" },
        { k: "brand", kind: "text", label: "fl_brand", ph: "ph_brand" },
        { k: "sku", kind: "text", label: "fl_sku", ph: "ph_sku" },
        { k: "_offer", kind: "subhead", label: "sub_offer", help: "help_offer" },
        { k: "price", kind: "number", label: "fl_price", ph: "ph_price", row: 1 },
        { k: "priceCurrency", kind: "select", label: "fl_currency", options: CURRENCY_OPTS, row: 1 },
        { k: "availability", kind: "select", label: "fl_availability", options: [
          { v: "https://schema.org/InStock", l: "av_instock" }, { v: "https://schema.org/OutOfStock", l: "av_outofstock" },
          { v: "https://schema.org/PreOrder", l: "av_preorder" }, { v: "https://schema.org/BackOrder", l: "av_backorder" },
        ] },
        { k: "url", kind: "url", label: "fl_offerUrl", ph: "ph_url" },
        { k: "_rating", kind: "subhead", label: "sub_rating", help: "help_rating" },
        { k: "ratingValue", kind: "number", label: "fl_ratingValue", ph: "ph_rating", row: 2 },
        { k: "reviewCount", kind: "number", label: "fl_reviewCount", ph: "ph_reviewcount", row: 2 },
      ],
      build(s) {
        const hasOffer = u(s.price) || u(s.availability) || u(s.url);
        const rating = (u(s.ratingValue) && u(s.reviewCount)) ? {
          "@type": "AggregateRating", ratingValue: u(s.ratingValue), reviewCount: u(s.reviewCount),
        } : undefined;
        return {
          "@context": CTX, "@type": "Product",
          name: u(s.name), image: u(s.image), description: u(s.description),
          sku: u(s.sku),
          brand: u(s.brand) ? { "@type": "Brand", name: u(s.brand) } : undefined,
          offers: hasOffer ? {
            "@type": "Offer",
            price: u(s.price),
            priceCurrency: u(s.price) ? (u(s.priceCurrency) || "EUR") : u(s.priceCurrency),
            availability: u(s.availability),
            url: u(s.url),
          } : undefined,
          aggregateRating: rating,
        };
      },
    },

    {
      key: "HowTo",
      fields: [
        { k: "name", kind: "text", req: true, label: "fl_howtoName", ph: "ph_howto" },
        { k: "description", kind: "textarea", label: "fl_description", ph: "ph_howto_desc" },
        { k: "totalTime", kind: "text", label: "fl_totalTime", ph: "ph_totaltime", help: "help_totaltime" },
        {
          k: "steps", kind: "repeat", req: true, min: 2, add: "add_step", item: "item_step",
          sub: [
            { k: "name", kind: "text", label: "fl_stepName", ph: "ph_stepname" },
            { k: "text", kind: "textarea", req: true, label: "fl_stepText", ph: "ph_steptext" },
            { k: "image", kind: "url", label: "fl_stepImage", ph: "ph_url" },
          ],
        },
      ],
      build(s, g) {
        const steps = (g.steps || []).filter((x) => u(x.text)).map((x) => clean({
          "@type": "HowToStep", name: u(x.name), text: u(x.text), image: u(x.image),
        }, true));
        return {
          "@context": CTX, "@type": "HowTo",
          name: u(s.name), description: u(s.description), totalTime: u(s.totalTime),
          step: steps,
        };
      },
    },

    {
      key: "BreadcrumbList",
      fields: [
        { k: "_bc", kind: "subhead", label: "sub_breadcrumb", help: "help_breadcrumb" },
        {
          k: "items", kind: "repeat", req: true, min: 2, add: "add_crumb", item: "item_crumb",
          sub: [
            { k: "name", kind: "text", req: true, label: "fl_crumbName", ph: "ph_crumbname" },
            { k: "url", kind: "url", req: true, label: "fl_crumbUrl", ph: "ph_url" },
          ],
        },
      ],
      build(s, g) {
        const items = (g.items || []).map((x) => ({ n: u(x.name), url: u(x.url) })).filter((x) => x.n);
        return {
          "@context": CTX, "@type": "BreadcrumbList",
          itemListElement: items.map((x, i) => clean({
            "@type": "ListItem", position: i + 1, name: x.n, item: x.url,
          }, true)),
        };
      },
    },

    {
      key: "Person",
      fields: [
        { k: "name", kind: "text", req: true, label: "fl_personName", ph: "ph_person" },
        { k: "jobTitle", kind: "text", label: "fl_jobTitle", ph: "ph_jobtitle" },
        { k: "worksFor", kind: "text", label: "fl_worksFor", ph: "ph_org" },
        { k: "url", kind: "url", label: "fl_url", ph: "ph_url" },
        { k: "image", kind: "url", label: "fl_image", ph: "ph_url" },
        { k: "email", kind: "text", label: "fl_email", ph: "ph_email" },
        { k: "telephone", kind: "text", label: "fl_telephone", ph: "ph_tel" },
        {
          k: "sameAs", kind: "repeat", min: 1, add: "add_sameAs", item: "item_sameAs", help: "help_sameAs_person",
          sub: [{ k: "url", kind: "url", label: "fl_profileUrl", ph: "ph_profile" }],
        },
      ],
      build(s, g) {
        return {
          "@context": CTX, "@type": "Person",
          name: u(s.name), jobTitle: u(s.jobTitle),
          worksFor: u(s.worksFor) ? { "@type": "Organization", name: u(s.worksFor) } : undefined,
          url: u(s.url), image: u(s.image), email: u(s.email), telephone: u(s.telephone),
          sameAs: (g.sameAs || []).map((x) => u(x.url)).filter(Boolean),
        };
      },
    },

    {
      key: "WebSite",
      fields: [
        { k: "name", kind: "text", req: true, label: "fl_siteName", ph: "ph_sitename" },
        { k: "url", kind: "url", req: true, label: "fl_url", ph: "ph_url" },
        { k: "inLanguage", kind: "text", label: "fl_inLanguage", ph: "ph_inlanguage", help: "help_inlanguage" },
        { k: "searchUrl", kind: "url", label: "fl_searchUrl", ph: "ph_searchurl", help: "help_searchurl" },
      ],
      build(s) {
        const o = {
          "@context": CTX, "@type": "WebSite",
          name: u(s.name), url: u(s.url), inLanguage: u(s.inLanguage),
        };
        if (u(s.searchUrl)) {
          o.potentialAction = {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: u(s.searchUrl) },
            "query-input": "required name=search_term_string",
          };
        }
        return o;
      },
    },

    {
      key: "Event",
      fields: [
        { k: "name", kind: "text", req: true, label: "fl_eventName", ph: "ph_event" },
        { k: "startDate", kind: "datetime", req: true, label: "fl_startDate", help: "help_startdate" },
        { k: "endDate", kind: "datetime", label: "fl_endDate" },
        { k: "attendanceMode", kind: "select", label: "fl_attendanceMode", options: [
          { v: "https://schema.org/OfflineEventAttendanceMode", l: "att_offline" },
          { v: "https://schema.org/OnlineEventAttendanceMode", l: "att_online" },
          { v: "https://schema.org/MixedEventAttendanceMode", l: "att_mixed" },
        ] },
        { k: "eventStatus", kind: "select", label: "fl_eventStatus", options: [
          { v: "https://schema.org/EventScheduled", l: "st_scheduled" },
          { v: "https://schema.org/EventCancelled", l: "st_cancelled" },
          { v: "https://schema.org/EventPostponed", l: "st_postponed" },
          { v: "https://schema.org/EventRescheduled", l: "st_rescheduled" },
        ] },
        { k: "image", kind: "url", label: "fl_image", ph: "ph_url" },
        { k: "url", kind: "url", label: "fl_url", ph: "ph_url" },
        { k: "description", kind: "textarea", label: "fl_description", ph: "ph_event_desc" },
        { k: "performer", kind: "text", label: "fl_performer", ph: "ph_performer" },
        { k: "_loc", kind: "subhead", label: "sub_location", help: "help_location" },
        { k: "locationName", kind: "text", req: true, label: "fl_locationName", ph: "ph_locationname" },
        { k: "street", kind: "text", label: "fl_street", ph: "ph_street" },
        { k: "locality", kind: "text", label: "fl_locality", ph: "ph_locality" },
        { k: "region", kind: "text", label: "fl_region", ph: "ph_region" },
        { k: "postal", kind: "text", label: "fl_postal", ph: "ph_postal" },
        { k: "country", kind: "text", label: "fl_country", ph: "ph_country" },
        { k: "_offer", kind: "subhead", label: "sub_offer_event" },
        { k: "price", kind: "number", label: "fl_price", ph: "ph_price", row: 1 },
        { k: "priceCurrency", kind: "select", label: "fl_currency", options: CURRENCY_OPTS, row: 1 },
        { k: "ticketUrl", kind: "url", label: "fl_ticketUrl", ph: "ph_url" },
      ],
      build(s) {
        const loc = u(s.locationName) ? clean({
          "@type": "Place", name: u(s.locationName), address: address(s, ""),
        }, true) : undefined;
        const hasOffer = u(s.price) || u(s.ticketUrl);
        return {
          "@context": CTX, "@type": "Event",
          name: u(s.name), startDate: u(s.startDate), endDate: u(s.endDate),
          eventAttendanceMode: u(s.attendanceMode), eventStatus: u(s.eventStatus),
          image: u(s.image), url: u(s.url), description: u(s.description),
          performer: u(s.performer) ? { "@type": "PerformingGroup", name: u(s.performer) } : undefined,
          location: loc,
          offers: hasOffer ? {
            "@type": "Offer", price: u(s.price),
            priceCurrency: u(s.price) ? (u(s.priceCurrency) || "EUR") : u(s.priceCurrency),
            url: u(s.ticketUrl),
          } : undefined,
        };
      },
    },
  ];

  const TYPE_MAP = {};
  TYPES.forEach((t) => (TYPE_MAP[t.key] = t));

  /* ============================================================
     i18n
     ============================================================ */
  const I18N = {
    en: {
      meta_title: "Free Schema & FAQ Generator · JSON-LD structured data · SEOryon",
      meta_desc: "Generate valid JSON-LD structured data — FAQ, Article, Product, LocalBusiness, HowTo and more — from a simple form. Copy the ready-to-paste script tag. Runs entirely in your browser.",
      nav_how: "How it works", nav_faq: "FAQ", cta_trial: "Start free trial →",
      hero_pill: "Runs in your browser · No sign-up · Free",
      hero_h1: 'Free <span class="brand-text">Schema &amp; FAQ generator</span>',
      hero_sub: "Pick a schema type, fill in a simple form, and get valid, ready-to-paste JSON-LD structured data — FAQ, Article, Product, LocalBusiness and more. Copy the script tag into your page's <head>. Everything runs in your browser; nothing is uploaded.",
      hero_img_alt: "Preview of the SEOryon Schema & FAQ Generator — a schema-type picker, a simple form, and live JSON-LD output ready to copy.",

      form_kicker: "Schema fields", out_kicker: "Generated JSON-LD",
      fmt_script: "Script tag", fmt_json: "Raw JSON",
      copy_btn: "Copy", copied_btn: "Copied ✓", download_btn: "Download .json",
      out_note: 'Paste this into your page\'s <code>&lt;head&gt;</code>. The field keys stay in English — that\'s the schema.org spec; your values are your own.',
      gen_privacy: "This generator runs entirely in your browser. Nothing you type is sent to a server, stored, or shared.",

      val_empty: "Fill in the fields to generate your schema.",
      val_ok: "Valid JSON-LD · all required fields present.",
      val_missing_one: "Valid JSON, but a required field is missing:",
      val_missing_many: "Valid JSON, but required fields are missing:",
      val_type_line: "Type: schema.org/{type}",
      code_empty: "// Fill in the form to generate your JSON-LD",

      how_h2: "How it works",
      how1_h3: "Pick a schema type", how1_p: "FAQ, Article, Product, LocalBusiness, HowTo and more. FAQ is the one AI engines love to quote — start there.",
      how2_h3: "Fill in the form", how2_p: "Required fields are marked; hints explain each one. Add or remove rows for things like FAQ pairs and HowTo steps. The JSON-LD updates live as you type.",
      how3_h3: "Copy & paste", how3_p: "Copy the ready-to-paste script tag (or download the JSON) and drop it into your page's head. That's it — valid structured data, no code.",

      why_kicker: "WHY STRUCTURED DATA", why_h2: "What schema actually does for you.",
      why_lead: 'Structured data is a machine-readable summary of your page. It won\'t magically unlock Google rich results — Google <strong>restricted FAQ rich results to government and health sites in 2023, then removed them for all sites in May 2026</strong>, so FAQ schema no longer shows as a rich result at all, and any tool that promises otherwise is bluffing. What it <em>does</em> do is real and worth doing:',
      why_c1_h: "AI engines can extract & cite it", why_c1_p: "ChatGPT, Perplexity, Gemini and Google's AI parse structured data to understand and quote your content. FAQ-shaped, clearly-answered content is the pattern that gets pulled into AI answers — the live GEO win.",
      why_c2_h: "Clean, valid page understanding", why_c2_p: "Correct JSON-LD tells search engines exactly what a page is — an article, a product, a business, an event — its author, price, or opening hours. It removes ambiguity from how your page is understood.",
      why_c3_h: "Valid by construction", why_c3_p: "Every type here follows schema.org and Google's documented required and recommended fields. We mark what's required, flag what's missing, and only ever emit valid JSON — so you can paste with confidence.",
      why_c4_h: "Yours, and private", why_c4_p: "The generator is plain JavaScript running in your browser. Your inputs never leave the page — there's no server, no API, no upload. Verify it: open your network tab and watch nothing get sent.",
      why_note: 'Sources: type definitions from <span class="nowrap">schema.org</span> and required/recommended fields from Google\'s Rich Results documentation. Output is escaped so a value like <code>&lt;/script&gt;</code> can never break the JSON-LD or inject markup into your page.',

      upsell_h2: 'This adds schema to one page. <span class="brand-text">SEOryon adds it to every article — automatically.</span>',
      upsell_p: "This generator marks up a page by hand. SEOryon builds the right structured data into every article it writes for you, so your content is shaped to be understood and cited by AI from the first draft — answer-first, FAQ-structured, and correctly marked up. It reads real search and AI-citation signals, decides what to publish, writes it, and tracks where you get cited across Google, ChatGPT, Perplexity and Gemini.",
      upsell_cta: "Start your 3-day free trial →",
      upsell_fine: "3-day free trial · 3 published articles · 1 in-depth LLM/GEO audit · Cancel in two clicks.",
      ben1_h: "Marked up by default", ben1_p: "Every article ships with the right schema and an answer-first, FAQ-shaped structure — the form AI engines quote — without you touching JSON-LD.",
      ben2_h: "Agency-scale, not agency-price", ben2_p: "One agent runs the whole research-to-publish loop, so you get the output of a content team from €39/month.",
      ben3_h: "You see where you're cited", ben3_p: "It tracks your mentions across Google, ChatGPT, Perplexity and Gemini — so structured data becomes a scoreboard.",

      faq_h2: "Questions, answered",
      faq1_q: "Will this get me rich results in Google?",
      faq1_a: 'Honestly, no — and we won\'t pretend otherwise. Google <strong>restricted FAQ rich results to government and health sites in 2023, then removed them for all sites in May 2026</strong>, so an FAQ schema won\'t show as a rich result anymore. The real, current value of structured data is two things: it helps <strong>AI engines</strong> (ChatGPT, Perplexity, Gemini, Google\'s AI) extract and cite your content, and it gives search engines clean, unambiguous data about your page. That\'s what this tool is for.',
      faq2_q: "Why is FAQ the hero here?",
      faq2_a: 'Because FAQ-shaped content — a clear question with a clean, self-contained answer — is the pattern AI engines pull into their answers most readily. Marking it up as <code>FAQPage</code> makes that structure explicit and machine-readable. It\'s the most direct structured-data lever on AI citation, which is why we put it first.',
      faq3_q: "Is the generated JSON-LD actually valid?",
      faq3_a: "Yes. Each type follows schema.org's definitions and Google's documented required and recommended fields. We flag any missing required fields, and the output is always valid JSON. You can paste it straight into Google's Rich Results Test or the Schema Markup Validator to confirm.",
      faq4_q: "Does it send my data anywhere?",
      faq4_a: "No. There is no server, no API, no upload. The whole generator runs as plain JavaScript in your browser, and nothing you type ever leaves the page. The only thing stored is your language and last-used type, kept locally in your browser.",
      faq5_q: "Where do I put the code?",
      faq5_a: 'Copy the <code>&lt;script type="application/ld+json"&gt;…&lt;/script&gt;</code> block and paste it into your page\'s <code>&lt;head&gt;</code> (the <code>&lt;body&gt;</code> works too). One block per page and per type. If you use a CMS, most have a way to inject a snippet into the head.',
      faq6_q: "Is it safe to paste values with quotes or angle brackets?",
      faq6_a: 'Yes — the output is escaped so a value containing <code>&lt;/script&gt;</code>, quotes, or <code>&lt;&gt;</code> can\'t break the JSON-LD or inject markup into your page. It stays valid JSON either way. Your text is preserved exactly; only the characters that would be unsafe inside a script tag are encoded.',
      faq7_q: "Does it work for German and French content?",
      faq7_a: "Yes. The whole interface — labels, hints, buttons, validation — is in English, German and French. Your input values stay exactly as you type them, in any language. The JSON-LD field <em>keys</em> (like <code>name</code>, <code>author</code>) stay in English because that's the schema.org specification, not a translation choice.",

      footer_cite: "AI citability grader", footer_score: "Score a live page", footer_roi: "SEO ROI calculator",
      footer_note: "A free JSON-LD schema & FAQ generator by SEOryon — your organic growth engine. Runs entirely in your browser; nothing is sent to a server.",

      /* type names + descriptions */
      chip_geo: "GEO",
      t_FAQPage_n: "FAQ", t_FAQPage_d: "Question-and-answer pairs. The structured-data pattern AI engines quote most — start here.",
      t_Article_n: "Article", t_Article_d: "A blog post, news story or article — headline, author, publisher and dates.",
      t_Organization_n: "Organization", t_Organization_d: "Your company or brand — name, logo, contact details and social profiles.",
      t_LocalBusiness_n: "Local Business", t_LocalBusiness_d: "A physical business — address, opening hours, geo-coordinates and price range.",
      t_Product_n: "Product", t_Product_d: "A product with price, availability and an optional aggregate rating.",
      t_HowTo_n: "How-To", t_HowTo_d: "A step-by-step guide — each step with its own text and optional image.",
      t_BreadcrumbList_n: "Breadcrumb", t_BreadcrumbList_d: "The trail of pages leading to the current one, in order.",
      t_Person_n: "Person", t_Person_d: "A person — name, job title, employer and social profiles.",
      t_WebSite_n: "Website", t_WebSite_d: "Your site — with an optional Sitelinks Search Box action.",
      t_Event_n: "Event", t_Event_d: "An event — dates, location, attendance mode and tickets.",

      /* shared field labels */
      fl_question: "Question", fl_answer: "Answer",
      fl_articleType: "Article type", fl_headline: "Headline", fl_description: "Description",
      fl_image: "Image URL", fl_authorName: "Author name", fl_authorUrl: "Author URL",
      fl_publisherName: "Publisher name", fl_publisherLogo: "Publisher logo URL",
      fl_datePublished: "Date published", fl_dateModified: "Date modified", fl_pageUrl: "Page URL",
      fl_orgName: "Organization name", fl_url: "URL", fl_logo: "Logo URL",
      fl_telephone: "Telephone", fl_email: "Email",
      fl_street: "Street address", fl_locality: "City / locality", fl_region: "Region / state",
      fl_postal: "Postal code", fl_country: "Country (2-letter code)",
      fl_profileUrl: "Profile URL",
      fl_bizType: "Business type", fl_bizName: "Business name", fl_priceRange: "Price range",
      fl_lat: "Latitude", fl_long: "Longitude", fl_day: "Day", fl_opens: "Opens", fl_closes: "Closes",
      fl_productName: "Product name", fl_brand: "Brand", fl_sku: "SKU",
      fl_price: "Price", fl_currency: "Currency", fl_availability: "Availability", fl_offerUrl: "Product URL",
      fl_ratingValue: "Rating value", fl_reviewCount: "Number of reviews",
      fl_howtoName: "Title", fl_totalTime: "Total time", fl_stepName: "Step title", fl_stepText: "Step instructions", fl_stepImage: "Step image URL",
      fl_crumbName: "Page name", fl_crumbUrl: "Page URL",
      fl_personName: "Full name", fl_jobTitle: "Job title", fl_worksFor: "Works for (organization)",
      fl_siteName: "Site name", fl_inLanguage: "Language", fl_searchUrl: "Search URL template",
      fl_eventName: "Event name", fl_startDate: "Start date & time", fl_endDate: "End date & time",
      fl_attendanceMode: "Attendance mode", fl_eventStatus: "Status", fl_performer: "Performer", fl_locationName: "Venue / location name", fl_ticketUrl: "Ticket URL",

      /* subheads */
      sub_address: "Address (optional)", sub_geo: "Geo-coordinates (optional)",
      sub_offer: "Offer (optional)", sub_rating: "Rating (optional)",
      sub_breadcrumb: "Breadcrumb trail", sub_location: "Location", sub_offer_event: "Tickets (optional)",

      /* repeat add / item labels */
      add_qa: "+ Add question", item_qa: "Question",
      add_sameAs: "+ Add social profile", item_sameAs: "Profile",
      add_hours: "+ Add opening hours", item_hours: "Hours",
      add_step: "+ Add step", item_step: "Step",
      add_crumb: "+ Add breadcrumb", item_crumb: "Level",

      /* select option labels */
      day_mon: "Monday", day_tue: "Tuesday", day_wed: "Wednesday", day_thu: "Thursday", day_fri: "Friday", day_sat: "Saturday", day_sun: "Sunday",
      biz_generic: "Local business (generic)", biz_restaurant: "Restaurant", biz_store: "Store", biz_cafe: "Café / coffee shop", biz_prof: "Professional service", biz_medical: "Medical business",
      av_instock: "In stock", av_outofstock: "Out of stock", av_preorder: "Pre-order", av_backorder: "Back-order",
      att_offline: "In person (offline)", att_online: "Online", att_mixed: "Hybrid (online + in person)",
      st_scheduled: "Scheduled", st_cancelled: "Cancelled", st_postponed: "Postponed", st_rescheduled: "Rescheduled",

      /* placeholders */
      ph_question: "e.g. Do you ship internationally?",
      ph_answer: "e.g. Yes — we ship to over 40 countries, with delivery in 3–7 business days.",
      ph_headline: "e.g. How generative engine optimization works",
      ph_description: "A short summary of the page.",
      ph_url: "https://example.com/…",
      ph_person: "e.g. Jane Doe", ph_org: "e.g. Acme Inc.", ph_org_desc: "What your organization does.",
      ph_tel: "e.g. +49 30 1234567", ph_email: "e.g. hello@example.com",
      ph_street: "e.g. 12 Market Street", ph_locality: "e.g. Berlin", ph_region: "e.g. Berlin", ph_postal: "e.g. 10115", ph_country: "e.g. DE",
      ph_profile: "https://twitter.com/yourbrand",
      ph_bizname: "e.g. Acme Coffee Roasters", ph_pricerange: "e.g. €€",
      ph_lat: "e.g. 52.5200", ph_long: "e.g. 13.4050",
      ph_product: "e.g. Wireless Noise-Cancelling Headphones", ph_product_desc: "A short product description.",
      ph_brand: "e.g. Acme", ph_sku: "e.g. ACM-1234", ph_price: "e.g. 199.00", ph_rating: "e.g. 4.6", ph_reviewcount: "e.g. 128",
      ph_howto: "e.g. How to set up your router", ph_howto_desc: "A short summary of the guide.",
      ph_totaltime: "e.g. PT30M", ph_stepname: "e.g. Plug in the router", ph_steptext: "Describe exactly what to do in this step.",
      ph_crumbname: "e.g. Home", ph_jobtitle: "e.g. Head of Marketing",
      ph_sitename: "e.g. Acme", ph_searchurl: "https://example.com/search?q={search_term_string}", ph_inlanguage: "e.g. en-US",
      ph_event: "e.g. Summer Product Launch", ph_performer: "e.g. The Speakers", ph_locationname: "e.g. Acme Conference Center",

      /* help */
      help_image: "A publicly accessible image URL (recommended for Article).",
      help_logo: "URL of the publisher's logo image. Recommended by Google.",
      help_pageurl: "The canonical URL of this article's page.",
      help_sameAs: "Links to your organization's official social profiles. Add one per row.",
      help_sameAs_person: "Links to this person's official profiles (LinkedIn, X, etc.). Add one per row.",
      help_bizimage: "A photo of the business. Required by Google for Local Business.",
      help_pricerange: "A relative price indicator, e.g. €, €€ or €€€.",
      help_geo: "Latitude & longitude of the business, in decimal degrees.",
      help_hours: "Add a row per day (or per opening period). Use 24-hour times.",
      help_prodimage: "A publicly accessible product image URL. Required by Google.",
      help_offer: "Add price + availability so the product can appear with an offer.",
      help_rating: "Only include a rating if it's genuine and visible on the page. Both fields are needed.",
      help_totaltime: "ISO-8601 duration. PT30M = 30 minutes, PT1H30M = 1 hour 30 min.",
      help_breadcrumb: "List the pages in order, from top level to the current page.",
      help_inlanguage: "BCP-47 language code, e.g. en-US, de-DE, fr-FR.",
      help_searchurl: "Your site's search URL with the literal token {search_term_string} where the query goes.",
      help_startdate: "Include the date and start time. The time zone from your browser is applied.",
      help_location: "The physical venue. For online-only events you can leave the address blank.",
    },

    de: {
      meta_title: "Kostenloser Schema- & FAQ-Generator · JSON-LD strukturierte Daten · SEOryon",
      meta_desc: "Erstelle gültige JSON-LD strukturierte Daten — FAQ, Artikel, Produkt, LocalBusiness, HowTo und mehr — über ein einfaches Formular. Kopiere den fertigen Script-Tag. Läuft komplett in deinem Browser.",
      nav_how: "So funktioniert's", nav_faq: "FAQ", cta_trial: "Kostenlos testen →",
      hero_pill: "Läuft in deinem Browser · Ohne Anmeldung · Kostenlos",
      hero_h1: 'Kostenloser <span class="brand-text">Schema-&amp;-FAQ-Generator</span>',
      hero_sub: "Wähle einen Schema-Typ, fülle ein einfaches Formular aus und erhalte gültige, fertig einzufügende JSON-LD strukturierte Daten — FAQ, Artikel, Produkt, LocalBusiness und mehr. Kopiere den Script-Tag in den <head> deiner Seite. Alles läuft in deinem Browser; nichts wird hochgeladen.",
      hero_img_alt: "Vorschau des SEOryon Schema- & FAQ-Generators — eine Typ-Auswahl, ein einfaches Formular und die JSON-LD-Ausgabe zum Kopieren.",

      form_kicker: "Schema-Felder", out_kicker: "Generiertes JSON-LD",
      fmt_script: "Script-Tag", fmt_json: "Reines JSON",
      copy_btn: "Kopieren", copied_btn: "Kopiert ✓", download_btn: ".json herunterladen",
      out_note: 'Füge das in den <code>&lt;head&gt;</code> deiner Seite ein. Die Feldnamen bleiben englisch — das ist die schema.org-Spezifikation; deine Werte gehören dir.',
      gen_privacy: "Dieser Generator läuft komplett in deinem Browser. Nichts, was du eingibst, wird an einen Server gesendet, gespeichert oder geteilt.",

      val_empty: "Fülle die Felder aus, um dein Schema zu erzeugen.",
      val_ok: "Gültiges JSON-LD · alle Pflichtfelder vorhanden.",
      val_missing_one: "Gültiges JSON, aber ein Pflichtfeld fehlt:",
      val_missing_many: "Gültiges JSON, aber es fehlen Pflichtfelder:",
      val_type_line: "Typ: schema.org/{type}",
      code_empty: "// Fülle das Formular aus, um dein JSON-LD zu erzeugen",

      how_h2: "So funktioniert's",
      how1_h3: "Schema-Typ wählen", how1_p: "FAQ, Artikel, Produkt, LocalBusiness, HowTo und mehr. FAQ wird von KI-Engines am liebsten zitiert — fang damit an.",
      how2_h3: "Formular ausfüllen", how2_p: "Pflichtfelder sind markiert, Hinweise erklären jedes einzelne. Füge Zeilen hinzu oder entferne sie — etwa für FAQ-Paare oder HowTo-Schritte. Das JSON-LD aktualisiert sich live beim Tippen.",
      how3_h3: "Kopieren & einfügen", how3_p: "Kopiere den fertigen Script-Tag (oder lade das JSON herunter) und füge ihn in den Head deiner Seite ein. Fertig — gültige strukturierte Daten, ganz ohne Code.",

      why_kicker: "WARUM STRUKTURIERTE DATEN", why_h2: "Was Schema wirklich für dich tut.",
      why_lead: 'Strukturierte Daten sind eine maschinenlesbare Zusammenfassung deiner Seite. Sie schalten keine Google-Rich-Results frei — Google <strong>hat FAQ-Rich-Results 2023 auf Behörden- und Gesundheitsseiten beschränkt und sie im Mai 2026 für alle Seiten abgeschafft</strong>, sodass FAQ-Schemata gar nicht mehr als Rich Result erscheinen; jedes Tool, das etwas anderes verspricht, blufft. Was es <em>tatsächlich</em> bewirkt, ist real und lohnt sich:',
      why_c1_h: "KI-Engines können es auslesen & zitieren", why_c1_p: "ChatGPT, Perplexity, Gemini und Googles KI werten strukturierte Daten aus, um deine Inhalte zu verstehen und zu zitieren. FAQ-förmige, klar beantwortete Inhalte sind das Muster, das in KI-Antworten landet — der eigentliche GEO-Gewinn.",
      why_c2_h: "Saubere, gültige Seiten-Interpretation", why_c2_p: "Korrektes JSON-LD sagt Suchmaschinen genau, was eine Seite ist — ein Artikel, ein Produkt, ein Unternehmen, ein Event — samt Autor, Preis oder Öffnungszeiten. Das nimmt jede Mehrdeutigkeit aus der Interpretation deiner Seite.",
      why_c3_h: "Gültig von Grund auf", why_c3_p: "Jeder Typ hier folgt schema.org und Googles dokumentierten Pflicht- und Empfehlungsfeldern. Wir markieren Pflichtfelder, weisen auf Fehlendes hin und geben ausschließlich gültiges JSON aus — damit du bedenkenlos einfügen kannst.",
      why_c4_h: "Deins, und privat", why_c4_p: "Der Generator ist reines JavaScript in deinem Browser. Deine Eingaben verlassen die Seite nie — kein Server, keine API, kein Upload. Prüf es selbst: Öffne den Netzwerk-Tab und sieh zu, wie nichts gesendet wird.",
      why_note: 'Quellen: Typdefinitionen von <span class="nowrap">schema.org</span> und Pflicht-/Empfehlungsfelder aus Googles Rich-Results-Dokumentation. Die Ausgabe ist so kodiert, dass ein Wert wie <code>&lt;/script&gt;</code> das JSON-LD niemals aufbrechen oder Markup in deine Seite einschleusen kann.',

      upsell_h2: 'Das versieht eine Seite mit Schema. <span class="brand-text">SEOryon versieht jeden Artikel damit — automatisch.</span>',
      upsell_p: "Dieser Generator markiert eine Seite von Hand. SEOryon baut die passenden strukturierten Daten in jeden Artikel ein, den es für dich schreibt — sodass deine Inhalte von der ersten Fassung an so aufgebaut sind, dass KI sie versteht und zitiert: antwortorientiert, FAQ-strukturiert und korrekt ausgezeichnet. Es liest echte Such- und KI-Zitationssignale, entscheidet, was veröffentlicht wird, schreibt es und verfolgt, wo du bei Google, ChatGPT, Perplexity und Gemini zitiert wirst.",
      upsell_cta: "Starte deine 3-Tage-Testphase →",
      upsell_fine: "3 Tage kostenlos testen · 3 veröffentlichte Artikel · 1 ausführliches LLM/GEO-Audit · Mit zwei Klicks kündbar.",
      ben1_h: "Standardmäßig ausgezeichnet", ben1_p: "Jeder Artikel erscheint mit dem passenden Schema und einer antwortorientierten, FAQ-förmigen Struktur — der Form, die KI-Engines zitieren — ganz ohne dass du JSON-LD anfasst.",
      ben2_h: "Agentur-Umfang, kein Agentur-Preis", ben2_p: "Ein Agent übernimmt die ganze Schleife von Recherche bis Veröffentlichung — du bekommst die Leistung eines Content-Teams ab 39 €/Monat.",
      ben3_h: "Du siehst, wo du zitiert wirst", ben3_p: "Es verfolgt deine Erwähnungen bei Google, ChatGPT, Perplexity und Gemini — so werden strukturierte Daten zur Anzeigetafel.",

      faq_h2: "Fragen, beantwortet",
      faq1_q: "Bekomme ich damit Rich Results in Google?",
      faq1_a: 'Ehrlich gesagt: nein — und wir tun nicht so, als wäre es anders. Google <strong>hat FAQ-Rich-Results 2023 auf Behörden- und Gesundheitsseiten beschränkt und sie im Mai 2026 für alle Seiten abgeschafft</strong>, deshalb erscheint ein FAQ-Schema nicht mehr als Rich Result. Der echte, aktuelle Wert strukturierter Daten liegt in zwei Dingen: Sie helfen <strong>KI-Engines</strong> (ChatGPT, Perplexity, Gemini, Googles KI), deine Inhalte auszulesen und zu zitieren, und sie geben Suchmaschinen saubere, eindeutige Daten über deine Seite. Genau dafür ist dieses Tool da.',
      faq2_q: "Warum steht FAQ hier im Mittelpunkt?",
      faq2_a: 'Weil FAQ-förmige Inhalte — eine klare Frage mit einer sauberen, in sich geschlossenen Antwort — das Muster sind, das KI-Engines am ehesten in ihre Antworten übernehmen. Die Auszeichnung als <code>FAQPage</code> macht diese Struktur explizit und maschinenlesbar. Es ist der direkteste Hebel strukturierter Daten auf KI-Zitationen — deshalb steht es an erster Stelle.',
      faq3_q: "Ist das erzeugte JSON-LD wirklich gültig?",
      faq3_a: "Ja. Jeder Typ folgt den Definitionen von schema.org und Googles dokumentierten Pflicht- und Empfehlungsfeldern. Wir weisen auf fehlende Pflichtfelder hin, und die Ausgabe ist immer gültiges JSON. Du kannst sie direkt in Googles Rich-Results-Test oder den Schema-Markup-Validator einfügen, um sie zu prüfen.",
      faq4_q: "Werden meine Daten irgendwohin gesendet?",
      faq4_a: "Nein. Es gibt keinen Server, keine API, keinen Upload. Der gesamte Generator läuft als reines JavaScript in deinem Browser, und nichts, was du eingibst, verlässt jemals die Seite. Gespeichert werden nur deine Sprache und der zuletzt genutzte Typ — lokal in deinem Browser.",
      faq5_q: "Wo füge ich den Code ein?",
      faq5_a: 'Kopiere den Block <code>&lt;script type="application/ld+json"&gt;…&lt;/script&gt;</code> und füge ihn in den <code>&lt;head&gt;</code> deiner Seite ein (der <code>&lt;body&gt;</code> geht auch). Ein Block pro Seite und pro Typ. Die meisten CMS bieten eine Möglichkeit, ein Snippet in den Head einzufügen.',
      faq6_q: "Ist es sicher, Werte mit Anführungszeichen oder spitzen Klammern einzufügen?",
      faq6_a: 'Ja — die Ausgabe ist so kodiert, dass ein Wert mit <code>&lt;/script&gt;</code>, Anführungszeichen oder <code>&lt;&gt;</code> das JSON-LD nicht aufbrechen und kein Markup in deine Seite einschleusen kann. Es bleibt in jedem Fall gültiges JSON. Dein Text bleibt exakt erhalten; nur die Zeichen, die innerhalb eines Script-Tags unsicher wären, werden kodiert.',
      faq7_q: "Funktioniert es für deutsche und französische Inhalte?",
      faq7_a: "Ja. Die gesamte Oberfläche — Beschriftungen, Hinweise, Buttons, Validierung — ist in Englisch, Deutsch und Französisch. Deine Eingabewerte bleiben genau so, wie du sie tippst, in jeder Sprache. Die JSON-LD-Feld<em>namen</em> (wie <code>name</code>, <code>author</code>) bleiben englisch, weil das die schema.org-Spezifikation ist, keine Übersetzungsentscheidung.",

      footer_cite: "KI-Zitierbarkeits-Check", footer_score: "Live-Seite prüfen", footer_roi: "SEO-ROI-Rechner",
      footer_note: "Ein kostenloser JSON-LD Schema- & FAQ-Generator von SEOryon — deiner Wachstumsmaschine für organischen Traffic. Läuft komplett in deinem Browser; nichts wird an einen Server gesendet.",

      chip_geo: "GEO",
      t_FAQPage_n: "FAQ", t_FAQPage_d: "Frage-Antwort-Paare. Das Muster strukturierter Daten, das KI-Engines am häufigsten zitieren — fang hier an.",
      t_Article_n: "Artikel", t_Article_d: "Ein Blogbeitrag, eine Nachricht oder ein Artikel — Überschrift, Autor, Herausgeber und Daten.",
      t_Organization_n: "Organisation", t_Organization_d: "Dein Unternehmen oder deine Marke — Name, Logo, Kontaktdaten und Social-Profile.",
      t_LocalBusiness_n: "Lokales Unternehmen", t_LocalBusiness_d: "Ein physisches Geschäft — Adresse, Öffnungszeiten, Geo-Koordinaten und Preisniveau.",
      t_Product_n: "Produkt", t_Product_d: "Ein Produkt mit Preis, Verfügbarkeit und optionaler Gesamtbewertung.",
      t_HowTo_n: "Anleitung", t_HowTo_d: "Eine Schritt-für-Schritt-Anleitung — jeder Schritt mit eigenem Text und optionalem Bild.",
      t_BreadcrumbList_n: "Breadcrumb", t_BreadcrumbList_d: "Der Pfad der Seiten, der zur aktuellen Seite führt, in Reihenfolge.",
      t_Person_n: "Person", t_Person_d: "Eine Person — Name, Position, Arbeitgeber und Social-Profile.",
      t_WebSite_n: "Website", t_WebSite_d: "Deine Website — mit optionaler Sitelinks-Suchfeld-Aktion.",
      t_Event_n: "Veranstaltung", t_Event_d: "Eine Veranstaltung — Daten, Ort, Teilnahmeart und Tickets.",

      fl_question: "Frage", fl_answer: "Antwort",
      fl_articleType: "Artikeltyp", fl_headline: "Überschrift", fl_description: "Beschreibung",
      fl_image: "Bild-URL", fl_authorName: "Name des Autors", fl_authorUrl: "URL des Autors",
      fl_publisherName: "Name des Herausgebers", fl_publisherLogo: "Logo-URL des Herausgebers",
      fl_datePublished: "Veröffentlicht am", fl_dateModified: "Geändert am", fl_pageUrl: "Seiten-URL",
      fl_orgName: "Name der Organisation", fl_url: "URL", fl_logo: "Logo-URL",
      fl_telephone: "Telefon", fl_email: "E-Mail",
      fl_street: "Straße und Hausnummer", fl_locality: "Stadt / Ort", fl_region: "Bundesland / Region",
      fl_postal: "Postleitzahl", fl_country: "Land (2-Buchstaben-Code)",
      fl_profileUrl: "Profil-URL",
      fl_bizType: "Art des Unternehmens", fl_bizName: "Name des Unternehmens", fl_priceRange: "Preisniveau",
      fl_lat: "Breitengrad", fl_long: "Längengrad", fl_day: "Tag", fl_opens: "Öffnet", fl_closes: "Schließt",
      fl_productName: "Produktname", fl_brand: "Marke", fl_sku: "Artikelnummer (SKU)",
      fl_price: "Preis", fl_currency: "Währung", fl_availability: "Verfügbarkeit", fl_offerUrl: "Produkt-URL",
      fl_ratingValue: "Bewertung", fl_reviewCount: "Anzahl der Bewertungen",
      fl_howtoName: "Titel", fl_totalTime: "Gesamtdauer", fl_stepName: "Titel des Schritts", fl_stepText: "Anweisung für den Schritt", fl_stepImage: "Bild-URL des Schritts",
      fl_crumbName: "Seitenname", fl_crumbUrl: "Seiten-URL",
      fl_personName: "Vollständiger Name", fl_jobTitle: "Position", fl_worksFor: "Arbeitgeber (Organisation)",
      fl_siteName: "Name der Website", fl_inLanguage: "Sprache", fl_searchUrl: "URL-Vorlage für die Suche",
      fl_eventName: "Name der Veranstaltung", fl_startDate: "Beginn (Datum & Uhrzeit)", fl_endDate: "Ende (Datum & Uhrzeit)",
      fl_attendanceMode: "Teilnahmeart", fl_eventStatus: "Status", fl_performer: "Mitwirkende", fl_locationName: "Name des Veranstaltungsorts", fl_ticketUrl: "Ticket-URL",

      sub_address: "Adresse (optional)", sub_geo: "Geo-Koordinaten (optional)",
      sub_offer: "Angebot (optional)", sub_rating: "Bewertung (optional)",
      sub_breadcrumb: "Breadcrumb-Pfad", sub_location: "Ort", sub_offer_event: "Tickets (optional)",

      add_qa: "+ Frage hinzufügen", item_qa: "Frage",
      add_sameAs: "+ Social-Profil hinzufügen", item_sameAs: "Profil",
      add_hours: "+ Öffnungszeit hinzufügen", item_hours: "Zeit",
      add_step: "+ Schritt hinzufügen", item_step: "Schritt",
      add_crumb: "+ Breadcrumb hinzufügen", item_crumb: "Ebene",

      day_mon: "Montag", day_tue: "Dienstag", day_wed: "Mittwoch", day_thu: "Donnerstag", day_fri: "Freitag", day_sat: "Samstag", day_sun: "Sonntag",
      biz_generic: "Lokales Unternehmen (allgemein)", biz_restaurant: "Restaurant", biz_store: "Geschäft", biz_cafe: "Café", biz_prof: "Dienstleistung", biz_medical: "Medizinischer Betrieb",
      av_instock: "Auf Lager", av_outofstock: "Nicht auf Lager", av_preorder: "Vorbestellung", av_backorder: "Nachbestellung",
      att_offline: "Vor Ort (offline)", att_online: "Online", att_mixed: "Hybrid (online + vor Ort)",
      st_scheduled: "Planmäßig", st_cancelled: "Abgesagt", st_postponed: "Verschoben", st_rescheduled: "Neu angesetzt",

      ph_question: "z. B. Versendet ihr international?",
      ph_answer: "z. B. Ja — wir versenden in über 40 Länder, Lieferung in 3–7 Werktagen.",
      ph_headline: "z. B. Wie Generative Engine Optimization funktioniert",
      ph_description: "Eine kurze Zusammenfassung der Seite.",
      ph_url: "https://beispiel.de/…",
      ph_person: "z. B. Erika Mustermann", ph_org: "z. B. Muster GmbH", ph_org_desc: "Was deine Organisation macht.",
      ph_tel: "z. B. +49 30 1234567", ph_email: "z. B. hallo@beispiel.de",
      ph_street: "z. B. Marktstraße 12", ph_locality: "z. B. Berlin", ph_region: "z. B. Berlin", ph_postal: "z. B. 10115", ph_country: "z. B. DE",
      ph_profile: "https://twitter.com/deinemarke",
      ph_bizname: "z. B. Muster Kaffeerösterei", ph_pricerange: "z. B. €€",
      ph_lat: "z. B. 52.5200", ph_long: "z. B. 13.4050",
      ph_product: "z. B. Kabellose Noise-Cancelling-Kopfhörer", ph_product_desc: "Eine kurze Produktbeschreibung.",
      ph_brand: "z. B. Muster", ph_sku: "z. B. MST-1234", ph_price: "z. B. 199,00", ph_rating: "z. B. 4,6", ph_reviewcount: "z. B. 128",
      ph_howto: "z. B. So richtest du deinen Router ein", ph_howto_desc: "Eine kurze Zusammenfassung der Anleitung.",
      ph_totaltime: "z. B. PT30M", ph_stepname: "z. B. Router anschließen", ph_steptext: "Beschreibe genau, was in diesem Schritt zu tun ist.",
      ph_crumbname: "z. B. Startseite", ph_jobtitle: "z. B. Marketingleitung",
      ph_sitename: "z. B. Muster", ph_searchurl: "https://beispiel.de/suche?q={search_term_string}", ph_inlanguage: "z. B. de-DE",
      ph_event: "z. B. Sommer-Produktlaunch", ph_performer: "z. B. Die Vortragenden", ph_locationname: "z. B. Muster Konferenzzentrum",

      help_image: "Eine öffentlich erreichbare Bild-URL (für Artikel empfohlen).",
      help_logo: "URL des Herausgeber-Logos. Von Google empfohlen.",
      help_pageurl: "Die kanonische URL der Seite dieses Artikels.",
      help_sameAs: "Links zu den offiziellen Social-Profilen deiner Organisation. Eines pro Zeile.",
      help_sameAs_person: "Links zu den offiziellen Profilen dieser Person (LinkedIn, X usw.). Eines pro Zeile.",
      help_bizimage: "Ein Foto des Unternehmens. Von Google für lokale Unternehmen verlangt.",
      help_pricerange: "Ein relativer Preisindikator, z. B. €, €€ oder €€€.",
      help_geo: "Breiten- und Längengrad des Unternehmens in Dezimalgrad.",
      help_hours: "Füge eine Zeile pro Tag (oder Öffnungszeitraum) hinzu. Nutze 24-Stunden-Zeiten.",
      help_prodimage: "Eine öffentlich erreichbare Produktbild-URL. Von Google verlangt.",
      help_offer: "Füge Preis + Verfügbarkeit hinzu, damit das Produkt mit einem Angebot erscheinen kann.",
      help_rating: "Gib eine Bewertung nur an, wenn sie echt und auf der Seite sichtbar ist. Beide Felder sind nötig.",
      help_totaltime: "ISO-8601-Dauer. PT30M = 30 Minuten, PT1H30M = 1 Std. 30 Min.",
      help_breadcrumb: "Liste die Seiten der Reihe nach auf, von der obersten Ebene bis zur aktuellen Seite.",
      help_inlanguage: "BCP-47-Sprachcode, z. B. en-US, de-DE, fr-FR.",
      help_searchurl: "Die Such-URL deiner Website mit dem wörtlichen Platzhalter {search_term_string} an der Stelle der Suchanfrage.",
      help_startdate: "Gib Datum und Startzeit an. Die Zeitzone deines Browsers wird angewandt.",
      help_location: "Der physische Veranstaltungsort. Bei reinen Online-Events kannst du die Adresse leer lassen.",
    },

    fr: {
      meta_title: "Générateur de Schema & FAQ gratuit · données structurées JSON-LD · SEOryon",
      meta_desc: "Générez des données structurées JSON-LD valides — FAQ, Article, Produit, LocalBusiness, HowTo et plus — via un formulaire simple. Copiez la balise script prête à coller. Tout tourne dans votre navigateur.",
      nav_how: "Comment ça marche", nav_faq: "FAQ", cta_trial: "Essai gratuit →",
      hero_pill: "Tourne dans votre navigateur · Sans inscription · Gratuit",
      hero_h1: 'Générateur de <span class="brand-text">Schema &amp; FAQ gratuit</span>',
      hero_sub: "Choisissez un type de schéma, remplissez un formulaire simple et obtenez des données structurées JSON-LD valides, prêtes à coller — FAQ, Article, Produit, LocalBusiness et plus. Copiez la balise script dans le <head> de votre page. Tout tourne dans votre navigateur ; rien n'est envoyé.",
      hero_img_alt: "Aperçu du générateur de Schema & FAQ SEOryon — un sélecteur de type, un formulaire simple et la sortie JSON-LD prête à copier.",

      form_kicker: "Champs du schéma", out_kicker: "JSON-LD généré",
      fmt_script: "Balise script", fmt_json: "JSON brut",
      copy_btn: "Copier", copied_btn: "Copié ✓", download_btn: "Télécharger le .json",
      out_note: "Collez ceci dans le <code>&lt;head&gt;</code> de votre page. Les noms de champs restent en anglais — c'est la spécification schema.org ; vos valeurs vous appartiennent.",
      gen_privacy: "Ce générateur tourne entièrement dans votre navigateur. Rien de ce que vous saisissez n'est envoyé à un serveur, stocké ou partagé.",

      val_empty: "Remplissez les champs pour générer votre schéma.",
      val_ok: "JSON-LD valide · tous les champs obligatoires sont présents.",
      val_missing_one: "JSON valide, mais un champ obligatoire manque :",
      val_missing_many: "JSON valide, mais des champs obligatoires manquent :",
      val_type_line: "Type : schema.org/{type}",
      code_empty: "// Remplissez le formulaire pour générer votre JSON-LD",

      how_h2: "Comment ça marche",
      how1_h3: "Choisissez un type", how1_p: "FAQ, Article, Produit, LocalBusiness, HowTo et plus. La FAQ est celle que les moteurs d'IA aiment le plus citer — commencez par là.",
      how2_h3: "Remplissez le formulaire", how2_p: "Les champs obligatoires sont marqués ; des indications expliquent chacun. Ajoutez ou retirez des lignes pour les paires de FAQ ou les étapes d'un HowTo. Le JSON-LD se met à jour en direct.",
      how3_h3: "Copiez & collez", how3_p: "Copiez la balise script prête à coller (ou téléchargez le JSON) et déposez-la dans le head de votre page. C'est tout — des données structurées valides, sans code.",

      why_kicker: "POURQUOI LES DONNÉES STRUCTURÉES", why_h2: "Ce que le schéma fait vraiment pour vous.",
      why_lead: 'Les données structurées sont un résumé lisible par les machines de votre page. Elles ne débloquent pas comme par magie les rich results de Google — Google <strong>a restreint les rich results FAQ aux sites gouvernementaux et de santé en 2023, puis les a supprimés pour tous les sites en mai 2026</strong>, donc les schémas FAQ n\'apparaissent plus du tout en rich result, et tout outil qui promet le contraire bluffe. Ce qu\'elles font <em>réellement</em> est concret et vaut la peine :',
      why_c1_h: "Les moteurs d'IA peuvent l'extraire & la citer", why_c1_p: "ChatGPT, Perplexity, Gemini et l'IA de Google analysent les données structurées pour comprendre et citer votre contenu. Un contenu en forme de FAQ, à la réponse claire, est le format repris dans les réponses d'IA — le vrai gain GEO.",
      why_c2_h: "Une compréhension propre et valide de la page", why_c2_p: "Un JSON-LD correct dit aux moteurs exactement ce qu'est une page — un article, un produit, une entreprise, un événement — avec son auteur, son prix ou ses horaires. Il lève toute ambiguïté sur la façon dont votre page est comprise.",
      why_c3_h: "Valide par construction", why_c3_p: "Chaque type suit schema.org et les champs obligatoires et recommandés documentés par Google. Nous marquons l'obligatoire, signalons ce qui manque, et ne produisons que du JSON valide — pour coller en toute confiance.",
      why_c4_h: "À vous, et privé", why_c4_p: "Le générateur est du JavaScript pur qui tourne dans votre navigateur. Vos saisies ne quittent jamais la page — pas de serveur, pas d'API, pas d'envoi. Vérifiez-le : ouvrez l'onglet réseau et constatez que rien n'est envoyé.",
      why_note: 'Sources : définitions de types de <span class="nowrap">schema.org</span> et champs obligatoires/recommandés de la documentation Rich Results de Google. La sortie est encodée pour qu\'une valeur comme <code>&lt;/script&gt;</code> ne puisse jamais casser le JSON-LD ni injecter de balisage dans votre page.',

      upsell_h2: 'Ceci ajoute du schéma à une page. <span class="brand-text">SEOryon l\'ajoute à chaque article — automatiquement.</span>',
      upsell_p: "Ce générateur balise une page à la main. SEOryon intègre les bonnes données structurées à chaque article qu'il rédige pour vous, afin que votre contenu soit, dès le premier jet, conçu pour être compris et cité par l'IA — orienté réponse, structuré en FAQ et correctement balisé. Il lit de vrais signaux de recherche et de citation par l'IA, décide quoi publier, le rédige, et suit où vous êtes cité sur Google, ChatGPT, Perplexity et Gemini.",
      upsell_cta: "Démarrez votre essai gratuit de 3 jours →",
      upsell_fine: "Essai gratuit de 3 jours · 3 articles publiés · 1 audit LLM/GEO approfondi · Annulable en deux clics.",
      ben1_h: "Balisé par défaut", ben1_p: "Chaque article part avec le bon schéma et une structure orientée réponse, en forme de FAQ — le format que les moteurs d'IA citent — sans que vous touchiez au JSON-LD.",
      ben2_h: "Échelle d'agence, sans le prix", ben2_p: "Un seul agent gère toute la boucle recherche-publication : vous obtenez la production d'une équipe de contenu à partir de 39 €/mois.",
      ben3_h: "Vous voyez où vous êtes cité", ben3_p: "Il suit vos mentions sur Google, ChatGPT, Perplexity et Gemini — les données structurées deviennent un tableau de bord.",

      faq_h2: "Questions, réponses",
      faq1_q: "Est-ce que ça me donnera des rich results dans Google ?",
      faq1_a: 'Honnêtement, non — et nous ne ferons pas semblant du contraire. Google <strong>a restreint les rich results FAQ aux sites gouvernementaux et de santé en 2023, puis les a supprimés pour tous les sites en mai 2026</strong>, donc un schéma FAQ n\'apparaît plus en rich result. La vraie valeur actuelle des données structurées tient à deux choses : elles aident les <strong>moteurs d\'IA</strong> (ChatGPT, Perplexity, Gemini, l\'IA de Google) à extraire et citer votre contenu, et elles donnent aux moteurs de recherche des données propres et sans ambiguïté sur votre page. C\'est précisément à ça que sert cet outil.',
      faq2_q: "Pourquoi la FAQ est-elle mise en avant ici ?",
      faq2_a: 'Parce qu\'un contenu en forme de FAQ — une question claire et une réponse propre, autonome — est le format que les moteurs d\'IA reprennent le plus facilement dans leurs réponses. Le baliser en <code>FAQPage</code> rend cette structure explicite et lisible par les machines. C\'est le levier de données structurées le plus direct sur la citation par l\'IA — d\'où sa première place.',
      faq3_q: "Le JSON-LD généré est-il réellement valide ?",
      faq3_a: "Oui. Chaque type suit les définitions de schema.org et les champs obligatoires et recommandés documentés par Google. Nous signalons tout champ obligatoire manquant, et la sortie est toujours du JSON valide. Vous pouvez la coller directement dans le test des résultats enrichis de Google ou le Schema Markup Validator pour vérifier.",
      faq4_q: "Est-ce que mes données sont envoyées quelque part ?",
      faq4_a: "Non. Il n'y a ni serveur, ni API, ni envoi. Tout le générateur tourne en JavaScript pur dans votre navigateur, et rien de ce que vous saisissez ne quitte jamais la page. Seuls votre langue et le dernier type utilisé sont conservés — localement, dans votre navigateur.",
      faq5_q: "Où dois-je mettre le code ?",
      faq5_a: 'Copiez le bloc <code>&lt;script type="application/ld+json"&gt;…&lt;/script&gt;</code> et collez-le dans le <code>&lt;head&gt;</code> de votre page (le <code>&lt;body&gt;</code> fonctionne aussi). Un bloc par page et par type. La plupart des CMS permettent d\'insérer un extrait dans le head.',
      faq6_q: "Est-ce sûr de coller des valeurs avec des guillemets ou des chevrons ?",
      faq6_a: 'Oui — la sortie est encodée pour qu\'une valeur contenant <code>&lt;/script&gt;</code>, des guillemets ou <code>&lt;&gt;</code> ne puisse pas casser le JSON-LD ni injecter de balisage dans votre page. Elle reste du JSON valide dans tous les cas. Votre texte est conservé exactement ; seuls les caractères qui seraient dangereux dans une balise script sont encodés.',
      faq7_q: "Est-ce que ça marche pour du contenu en allemand et en français ?",
      faq7_a: "Oui. Toute l'interface — libellés, indications, boutons, validation — est en anglais, allemand et français. Vos valeurs saisies restent exactement telles que vous les tapez, dans n'importe quelle langue. Les <em>noms</em> de champs JSON-LD (comme <code>name</code>, <code>author</code>) restent en anglais, car c'est la spécification schema.org, non un choix de traduction.",

      footer_cite: "Testeur de citabilité IA", footer_score: "Analyser une page en ligne", footer_roi: "Calculateur de ROI SEO",
      footer_note: "Un générateur de schema & FAQ JSON-LD gratuit par SEOryon — votre moteur de croissance organique. Tourne entièrement dans votre navigateur ; rien n'est envoyé à un serveur.",

      chip_geo: "GEO",
      t_FAQPage_n: "FAQ", t_FAQPage_d: "Des paires question-réponse. Le format de données structurées que les moteurs d'IA citent le plus — commencez ici.",
      t_Article_n: "Article", t_Article_d: "Un billet de blog, une actualité ou un article — titre, auteur, éditeur et dates.",
      t_Organization_n: "Organisation", t_Organization_d: "Votre entreprise ou marque — nom, logo, coordonnées et profils sociaux.",
      t_LocalBusiness_n: "Entreprise locale", t_LocalBusiness_d: "Un commerce physique — adresse, horaires, coordonnées géographiques et niveau de prix.",
      t_Product_n: "Produit", t_Product_d: "Un produit avec prix, disponibilité et une note globale facultative.",
      t_HowTo_n: "Tutoriel", t_HowTo_d: "Un guide étape par étape — chaque étape avec son texte et une image facultative.",
      t_BreadcrumbList_n: "Fil d'Ariane", t_BreadcrumbList_d: "Le chemin des pages menant à la page actuelle, dans l'ordre.",
      t_Person_n: "Personne", t_Person_d: "Une personne — nom, fonction, employeur et profils sociaux.",
      t_WebSite_n: "Site web", t_WebSite_d: "Votre site — avec une action de champ de recherche Sitelinks facultative.",
      t_Event_n: "Événement", t_Event_d: "Un événement — dates, lieu, mode de participation et billets.",

      fl_question: "Question", fl_answer: "Réponse",
      fl_articleType: "Type d'article", fl_headline: "Titre", fl_description: "Description",
      fl_image: "URL de l'image", fl_authorName: "Nom de l'auteur", fl_authorUrl: "URL de l'auteur",
      fl_publisherName: "Nom de l'éditeur", fl_publisherLogo: "URL du logo de l'éditeur",
      fl_datePublished: "Date de publication", fl_dateModified: "Date de modification", fl_pageUrl: "URL de la page",
      fl_orgName: "Nom de l'organisation", fl_url: "URL", fl_logo: "URL du logo",
      fl_telephone: "Téléphone", fl_email: "E-mail",
      fl_street: "Adresse (rue et numéro)", fl_locality: "Ville / localité", fl_region: "Région / département",
      fl_postal: "Code postal", fl_country: "Pays (code à 2 lettres)",
      fl_profileUrl: "URL du profil",
      fl_bizType: "Type d'entreprise", fl_bizName: "Nom de l'entreprise", fl_priceRange: "Niveau de prix",
      fl_lat: "Latitude", fl_long: "Longitude", fl_day: "Jour", fl_opens: "Ouvre", fl_closes: "Ferme",
      fl_productName: "Nom du produit", fl_brand: "Marque", fl_sku: "Référence (SKU)",
      fl_price: "Prix", fl_currency: "Devise", fl_availability: "Disponibilité", fl_offerUrl: "URL du produit",
      fl_ratingValue: "Note", fl_reviewCount: "Nombre d'avis",
      fl_howtoName: "Titre", fl_totalTime: "Durée totale", fl_stepName: "Titre de l'étape", fl_stepText: "Instructions de l'étape", fl_stepImage: "URL de l'image de l'étape",
      fl_crumbName: "Nom de la page", fl_crumbUrl: "URL de la page",
      fl_personName: "Nom complet", fl_jobTitle: "Fonction", fl_worksFor: "Employeur (organisation)",
      fl_siteName: "Nom du site", fl_inLanguage: "Langue", fl_searchUrl: "Modèle d'URL de recherche",
      fl_eventName: "Nom de l'événement", fl_startDate: "Début (date & heure)", fl_endDate: "Fin (date & heure)",
      fl_attendanceMode: "Mode de participation", fl_eventStatus: "Statut", fl_performer: "Intervenant(s)", fl_locationName: "Nom du lieu", fl_ticketUrl: "URL de billetterie",

      sub_address: "Adresse (facultatif)", sub_geo: "Coordonnées géo (facultatif)",
      sub_offer: "Offre (facultatif)", sub_rating: "Note (facultatif)",
      sub_breadcrumb: "Fil d'Ariane", sub_location: "Lieu", sub_offer_event: "Billets (facultatif)",

      add_qa: "+ Ajouter une question", item_qa: "Question",
      add_sameAs: "+ Ajouter un profil social", item_sameAs: "Profil",
      add_hours: "+ Ajouter des horaires", item_hours: "Horaires",
      add_step: "+ Ajouter une étape", item_step: "Étape",
      add_crumb: "+ Ajouter un niveau", item_crumb: "Niveau",

      day_mon: "Lundi", day_tue: "Mardi", day_wed: "Mercredi", day_thu: "Jeudi", day_fri: "Vendredi", day_sat: "Samedi", day_sun: "Dimanche",
      biz_generic: "Entreprise locale (générique)", biz_restaurant: "Restaurant", biz_store: "Magasin", biz_cafe: "Café", biz_prof: "Service professionnel", biz_medical: "Établissement médical",
      av_instock: "En stock", av_outofstock: "En rupture", av_preorder: "Précommande", av_backorder: "En réassort",
      att_offline: "Sur place (présentiel)", att_online: "En ligne", att_mixed: "Hybride (en ligne + présentiel)",
      st_scheduled: "Prévu", st_cancelled: "Annulé", st_postponed: "Reporté", st_rescheduled: "Reprogrammé",

      ph_question: "ex. Livrez-vous à l'international ?",
      ph_answer: "ex. Oui — nous livrons dans plus de 40 pays, sous 3 à 7 jours ouvrés.",
      ph_headline: "ex. Comment fonctionne la generative engine optimization",
      ph_description: "Un bref résumé de la page.",
      ph_url: "https://exemple.fr/…",
      ph_person: "ex. Marie Dupont", ph_org: "ex. Acme SARL", ph_org_desc: "Ce que fait votre organisation.",
      ph_tel: "ex. +33 1 23 45 67 89", ph_email: "ex. bonjour@exemple.fr",
      ph_street: "ex. 12 rue du Marché", ph_locality: "ex. Paris", ph_region: "ex. Île-de-France", ph_postal: "ex. 75001", ph_country: "ex. FR",
      ph_profile: "https://twitter.com/votremarque",
      ph_bizname: "ex. Torréfaction Acme", ph_pricerange: "ex. €€",
      ph_lat: "ex. 48.8566", ph_long: "ex. 2.3522",
      ph_product: "ex. Casque sans fil à réduction de bruit", ph_product_desc: "Une brève description du produit.",
      ph_brand: "ex. Acme", ph_sku: "ex. ACM-1234", ph_price: "ex. 199,00", ph_rating: "ex. 4,6", ph_reviewcount: "ex. 128",
      ph_howto: "ex. Comment configurer votre routeur", ph_howto_desc: "Un bref résumé du guide.",
      ph_totaltime: "ex. PT30M", ph_stepname: "ex. Brancher le routeur", ph_steptext: "Décrivez précisément quoi faire à cette étape.",
      ph_crumbname: "ex. Accueil", ph_jobtitle: "ex. Directrice marketing",
      ph_sitename: "ex. Acme", ph_searchurl: "https://exemple.fr/recherche?q={search_term_string}", ph_inlanguage: "ex. fr-FR",
      ph_event: "ex. Lancement produit d'été", ph_performer: "ex. Les intervenants", ph_locationname: "ex. Centre de conférences Acme",

      help_image: "Une URL d'image accessible publiquement (recommandée pour Article).",
      help_logo: "URL du logo de l'éditeur. Recommandé par Google.",
      help_pageurl: "L'URL canonique de la page de cet article.",
      help_sameAs: "Liens vers les profils sociaux officiels de votre organisation. Un par ligne.",
      help_sameAs_person: "Liens vers les profils officiels de cette personne (LinkedIn, X, etc.). Un par ligne.",
      help_bizimage: "Une photo de l'entreprise. Exigée par Google pour une entreprise locale.",
      help_pricerange: "Un indicateur de prix relatif, ex. €, €€ ou €€€.",
      help_geo: "Latitude et longitude de l'entreprise, en degrés décimaux.",
      help_hours: "Ajoutez une ligne par jour (ou par période d'ouverture). Utilisez le format 24 h.",
      help_prodimage: "Une URL d'image produit accessible publiquement. Exigée par Google.",
      help_offer: "Ajoutez prix + disponibilité pour que le produit apparaisse avec une offre.",
      help_rating: "N'incluez une note que si elle est réelle et visible sur la page. Les deux champs sont requis.",
      help_totaltime: "Durée ISO-8601. PT30M = 30 minutes, PT1H30M = 1 h 30.",
      help_breadcrumb: "Listez les pages dans l'ordre, du niveau le plus haut à la page actuelle.",
      help_inlanguage: "Code de langue BCP-47, ex. en-US, de-DE, fr-FR.",
      help_searchurl: "L'URL de recherche de votre site avec le jeton littéral {search_term_string} à l'emplacement de la requête.",
      help_startdate: "Indiquez la date et l'heure de début. Le fuseau horaire de votre navigateur est appliqué.",
      help_location: "Le lieu physique. Pour les événements uniquement en ligne, vous pouvez laisser l'adresse vide.",
    },
  };

  /* ============================================================
     State + DOM
     ============================================================ */
  let currentLang = "en";
  let currentType = "FAQPage";
  let currentFmt = "script";
  const store = {}; // { [typeKey]: { scalars:{}, groups:{ [groupKey]: [ {sub:val} ] } } }

  const typebar = document.getElementById("typebar");
  const formFields = document.getElementById("formFields");
  const typeDesc = document.getElementById("typeDesc");
  const codeOut = document.getElementById("codeOut");
  const validationEl = document.getElementById("validation");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const dictNow = () => I18N[currentLang] || I18N.en;
  const tr = (k) => {
    const d = dictNow();
    return (k in d) ? d[k] : (k in I18N.en ? I18N.en[k] : k);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtVar = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));

  /* ---------- store access ---------- */
  const typeStore = (typeKey) => {
    if (!store[typeKey]) store[typeKey] = { scalars: {}, groups: {} };
    return store[typeKey];
  };

  /* ---------- field rendering ---------- */
  function inputEl(field, value, dataAttrs) {
    let el;
    const kind = field.kind;
    if (kind === "textarea") {
      el = document.createElement("textarea");
      el.rows = 3;
      if (field.ph) el.placeholder = tr(field.ph);
      el.value = value || "";
    } else if (kind === "select") {
      el = document.createElement("select");
      (field.options || []).forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.v;
        o.textContent = opt.l ? tr(opt.l) : opt.v;
        el.appendChild(o);
      });
      if (value) el.value = value;
    } else {
      el = document.createElement("input");
      el.type = kind === "url" ? "url"
        : kind === "number" ? "number"
        : kind === "date" ? "date"
        : kind === "datetime" ? "datetime-local"
        : kind === "time" ? "time" : "text";
      if (kind === "number") el.step = "any";
      if (field.ph) el.placeholder = tr(field.ph);
      el.value = value || "";
    }
    el.setAttribute("spellcheck", "false");
    Object.keys(dataAttrs).forEach((k) => el.setAttribute(k, dataAttrs[k]));
    return el;
  }

  function labelFor(field, forId) {
    const lab = document.createElement("label");
    lab.setAttribute("for", forId);
    lab.textContent = tr(field.label);
    if (field.req) {
      const r = document.createElement("span");
      r.className = "req"; r.textContent = "*"; r.setAttribute("aria-hidden", "true");
      lab.appendChild(r);
    }
    return lab;
  }

  let idSeq = 0;
  function scalarField(field, value) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const id = "f_" + (idSeq++);
    wrap.appendChild(labelFor(field, id));
    const el = inputEl(field, value, { id, "data-field": field.k });
    wrap.appendChild(el);
    if (field.help) {
      const h = document.createElement("p");
      h.className = "field-help"; h.innerHTML = tr(field.help);
      wrap.appendChild(h);
    }
    return wrap;
  }

  function subheadField(field) {
    const box = document.createElement("div");
    const sep = document.createElement("div"); sep.className = "form-sep"; box.appendChild(sep);
    const h = document.createElement("div"); h.className = "form-subhead"; h.textContent = tr(field.label);
    box.appendChild(h);
    if (field.help) {
      const p = document.createElement("p"); p.className = "field-help"; p.style.marginBottom = "12px"; p.innerHTML = tr(field.help);
      box.appendChild(p);
    }
    return box;
  }

  // Render a repeatable group. rows = array of value-objects.
  function repeatGroup(field, rows) {
    const group = document.createElement("div");
    group.className = "repeat-group";
    group.setAttribute("data-group", field.k);

    const legend = document.createElement("div");
    legend.className = "repeat-legend";
    const span = document.createElement("span");
    span.textContent = tr(field.item) + "s";
    if (field.req) { const r = document.createElement("span"); r.className = "req"; r.textContent = "*"; legend.appendChild(span); legend.appendChild(r); }
    else legend.appendChild(span);
    group.appendChild(legend);

    if (field.help) {
      const h = document.createElement("p"); h.className = "field-help"; h.style.marginBottom = "12px"; h.innerHTML = tr(field.help);
      group.appendChild(h);
    }

    const list = document.createElement("div");
    list.className = "repeat-list";
    group.appendChild(list);

    const min = field.min || 1;
    const start = (rows && rows.length) ? rows : Array.from({ length: min }, () => ({}));
    start.forEach((rowVals) => list.appendChild(repeatItem(field, rowVals)));

    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.className = "repeat-add"; addBtn.textContent = tr(field.add);
    addBtn.addEventListener("click", () => {
      list.appendChild(repeatItem(field, {}));
      refreshRepeatUI(list, field);
      onInput();
    });
    group.appendChild(addBtn);

    refreshRepeatUI(list, field);
    return group;
  }

  function repeatItem(field, rowVals) {
    const item = document.createElement("div");
    item.className = "repeat-item";

    const head = document.createElement("div");
    head.className = "repeat-item-head";
    const idx = document.createElement("span"); idx.className = "repeat-idx";
    head.appendChild(idx);
    const rm = document.createElement("button");
    rm.type = "button"; rm.className = "repeat-remove"; rm.textContent = "✕";
    rm.setAttribute("aria-label", "Remove");
    rm.addEventListener("click", () => {
      const list = item.parentElement;
      item.remove();
      refreshRepeatUI(list, field);
      onInput();
    });
    head.appendChild(rm);
    item.appendChild(head);

    field.sub.forEach((sf) => {
      const wrap = document.createElement("div");
      wrap.className = "field";
      const id = "f_" + (idSeq++);
      wrap.appendChild(labelFor(sf, id));
      const el = inputEl(sf, rowVals[sf.k], { id, "data-sub": sf.k });
      wrap.appendChild(el);
      if (sf.help) { const h = document.createElement("p"); h.className = "field-help"; h.innerHTML = tr(sf.help); wrap.appendChild(h); }
      item.appendChild(wrap);
    });
    return item;
  }

  function refreshRepeatUI(list, field) {
    const items = Array.from(list.querySelectorAll(".repeat-item"));
    const min = field.min || 1;
    items.forEach((it, i) => {
      it.querySelector(".repeat-idx").textContent = tr(field.item) + " " + (i + 1);
      const rm = it.querySelector(".repeat-remove");
      rm.disabled = items.length <= min;
    });
  }

  function renderForm() {
    const type = TYPE_MAP[currentType];
    const st = typeStore(currentType);
    formFields.innerHTML = "";
    typeDesc.textContent = tr("t_" + type.key + "_d");
    idSeq = 0;

    // group compact "row" fields (row:N) into a .field-row
    let i = 0;
    const fields = type.fields;
    while (i < fields.length) {
      const f = fields[i];
      if (f.kind === "subhead") { formFields.appendChild(subheadField(f)); i++; continue; }
      if (f.kind === "repeat") {
        formFields.appendChild(repeatGroup(f, (st.groups[f.k] || null)));
        i++; continue;
      }
      if (f.row) {
        // collect consecutive fields with the same row id
        const rowId = f.row;
        const rowFields = [];
        while (i < fields.length && fields[i].row === rowId) { rowFields.push(fields[i]); i++; }
        const rowWrap = document.createElement("div");
        rowWrap.className = "field-row";
        rowFields.forEach((rf) => rowWrap.appendChild(scalarField(rf, st.scalars[rf.k])));
        formFields.appendChild(rowWrap);
        continue;
      }
      formFields.appendChild(scalarField(f, st.scalars[f.k]));
      i++;
    }
    onInput();
  }

  /* ---------- collect ---------- */
  function collect() {
    const st = typeStore(currentType);
    st.scalars = {};
    st.groups = {};
    formFields.querySelectorAll("[data-field]").forEach((el) => {
      st.scalars[el.getAttribute("data-field")] = el.value;
    });
    formFields.querySelectorAll(".repeat-group").forEach((g) => {
      const gk = g.getAttribute("data-group");
      const rows = [];
      g.querySelectorAll(".repeat-item").forEach((it) => {
        const row = {};
        it.querySelectorAll("[data-sub]").forEach((el) => { row[el.getAttribute("data-sub")] = el.value; });
        rows.push(row);
      });
      st.groups[gk] = rows;
    });
    return st;
  }

  function hasAnyValue(st) {
    for (const k in st.scalars) { if (u(st.scalars[k])) return true; }
    for (const gk in st.groups) {
      for (const row of st.groups[gk]) { for (const sk in row) { if (u(row[sk])) return true; } }
    }
    return false;
  }

  /* ---------- required-field validation ---------- */
  function missingRequired(type, st) {
    const missing = [];
    type.fields.forEach((f) => {
      if (f.kind === "subhead") return;
      if (f.kind === "repeat") {
        if (!f.req) return;
        const rows = st.groups[f.k] || [];
        const complete = rows.filter((r) => f.sub.every((sf) => !sf.req || u(r[sf.k])));
        if (complete.length === 0) missing.push(tr(f.item) + "s");
        return;
      }
      if (f.req && !u(st.scalars[f.k])) missing.push(tr(f.label));
    });
    return missing;
  }

  /* ---------- JSON-LD safe serialization ---------- */
  // Turn characters that are unsafe inside an HTML <script> into \u escapes.
  // Keeps the output valid JSON while making </script>, <, >, & injection-proof.
  const jsonLdSafe = (s) => s.replace(/[<>&\u2028\u2029]/g, (c) => {
    const cc = c.charCodeAt(0);
    return cc === 0x3c ? "\\u003c"
      : cc === 0x3e ? "\\u003e"
      : cc === 0x26 ? "\\u0026"
      : cc === 0x2028 ? "\\u2028"
      : "\\u2029";
  });

  function buildObject() {
    const type = TYPE_MAP[currentType];
    const st = collect();
    const raw = type.build(st.scalars, st.groups);
    return { obj: clean(raw, true), st };
  }

  function outputText(obj) {
    const jsonSafe = jsonLdSafe(JSON.stringify(obj, null, 2));
    if (currentFmt === "script") {
      return '<script type="application/ld+json">\n' + jsonSafe + "\n<\/script>";
    }
    return jsonSafe;
  }

  /* ---------- syntax highlight (display only) ---------- */
  function highlight(json) {
    const re = /("(?:\\.|[^"\\])*")(\s*:)?|([{}\[\],])|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;
    let out = "", last = 0, m;
    while ((m = re.exec(json)) !== null) {
      out += esc(json.slice(last, m.index));
      if (m[1] !== undefined) {
        if (m[2] !== undefined) {
          out += '<span class="tok-key">' + esc(m[1]) + '</span><span class="tok-punc">' + esc(m[2]) + "</span>";
        } else {
          out += '<span class="tok-str">' + esc(m[1]) + "</span>";
        }
      } else if (m[3] !== undefined) {
        out += '<span class="tok-punc">' + esc(m[3]) + "</span>";
      } else if (m[4] !== undefined || m[5] !== undefined) {
        out += '<span class="tok-str">' + esc(m[0]) + "</span>";
      }
      last = re.lastIndex;
    }
    out += esc(json.slice(last));
    return out;
  }

  /* ---------- render output ---------- */
  let lastOutput = "";
  let lastEmpty = true;

  function onInput() {
    const type = TYPE_MAP[currentType];
    const { obj, st } = buildObject();
    const any = hasAnyValue(st);
    lastEmpty = !any;

    if (!any) {
      codeOut.innerHTML = '<span class="code-empty">' + esc(tr("code_empty")) + "</span>";
      validationEl.innerHTML = validLine("info", "◆", esc(tr("val_empty")));
      lastOutput = "";
      copyBtn.disabled = true; downloadBtn.disabled = true;
      copyBtn.classList.remove("copied"); copyBtn.textContent = tr("copy_btn");
      return;
    }

    copyBtn.disabled = false; downloadBtn.disabled = false;
    const jsonSafe = jsonLdSafe(JSON.stringify(obj, null, 2));
    lastOutput = outputText(obj);

    if (currentFmt === "script") {
      codeOut.innerHTML =
        '<span class="tok-tag">&lt;script type=&quot;application/ld+json&quot;&gt;</span>\n' +
        highlight(jsonSafe) +
        '\n<span class="tok-tag">&lt;/script&gt;</span>';
    } else {
      codeOut.innerHTML = highlight(jsonSafe);
    }

    // validation
    const missing = missingRequired(type, st);
    let html = "";
    if (missing.length === 0) {
      html += validLine("ok", "✓", esc(tr("val_ok")));
    } else {
      const lead = missing.length === 1 ? tr("val_missing_one") : tr("val_missing_many");
      html += validLine("warn", "!", "<strong>" + esc(lead) + "</strong> " + missing.map(esc).join(", "));
    }
    html += validLine("info", "◆", esc(fmtVar(tr("val_type_line"), { type: type.key })));
    validationEl.innerHTML = html;

    if (!copyBtn.classList.contains("copied")) copyBtn.textContent = tr("copy_btn");
  }

  function validLine(kind, icon, innerHtml) {
    return '<div class="valid-line ' + kind + '"><span class="vl-icon" aria-hidden="true">' + icon + "</span><span>" + innerHtml + "</span></div>";
  }

  /* ---------- type picker ---------- */
  function renderTypebar() {
    typebar.innerHTML = "";
    TYPES.forEach((type) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "type-chip" + (type.hero ? " hero-chip" : "") + (type.key === currentType ? " active" : "");
      chip.setAttribute("data-type", type.key);
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", type.key === currentType ? "true" : "false");
      if (type.hero) { const s = document.createElement("span"); s.className = "chip-star"; s.textContent = "★"; chip.appendChild(s); }
      const label = document.createElement("span");
      label.textContent = tr("t_" + type.key + "_n");
      chip.appendChild(label);
      if (type.badge) { const b = document.createElement("span"); b.className = "chip-badge"; b.textContent = tr(type.badge); chip.appendChild(b); }
      chip.addEventListener("click", () => {
        if (currentType === type.key) return;
        collect(); // save current type's values
        currentType = type.key;
        try { localStorage.setItem(STORAGE_TYPE, currentType); } catch (_) { /* ignore */ }
        renderTypebar();
        renderForm();
      });
      typebar.appendChild(chip);
    });
  }

  /* ---------- language ---------- */
  const pickInitialLang = () => {
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      if (q && SUPPORTED.includes(q.toLowerCase())) return q.toLowerCase();
    } catch (_) { /* ignore */ }
    try {
      const saved = localStorage.getItem(STORAGE_LANG);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch (_) { /* ignore */ }
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : "en";
  };

  function applyStaticI18n() {
    const d = dictNow();
    document.querySelectorAll("[data-i18n]").forEach((el) => { const v = d[el.getAttribute("data-i18n")]; if (v != null) el.textContent = v; });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { const v = d[el.getAttribute("data-i18n-html")]; if (v != null) el.innerHTML = v; });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => { const v = d[el.getAttribute("data-i18n-alt")]; if (v != null) el.setAttribute("alt", v); });
    if (d.meta_title) document.title = d.meta_title;
    const md = document.querySelector('meta[name="description"]');
    if (md && d.meta_desc) md.setAttribute("content", d.meta_desc);
    document.documentElement.setAttribute("lang", currentLang);
    document.querySelectorAll(".lang-btn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-lang") === currentLang));
    // output segmented labels + buttons
    document.querySelectorAll(".seg-btn").forEach((b) => { const k = b.getAttribute("data-fmt") === "script" ? "fmt_script" : "fmt_json"; b.textContent = tr(k); });
    downloadBtn.textContent = tr("download_btn");
    if (!copyBtn.classList.contains("copied")) copyBtn.textContent = tr("copy_btn");
  }

  const applyLang = (lang) => {
    currentLang = SUPPORTED.includes(lang) ? lang : "en";
    try { localStorage.setItem(STORAGE_LANG, currentLang); } catch (_) { /* ignore */ }
    collect(); // preserve current inputs across the re-render
    applyStaticI18n();
    renderTypebar();
    renderForm();
  };

  /* ---------- copy / download ---------- */
  function doCopy() {
    if (!lastOutput) return;
    const done = () => {
      copyBtn.classList.add("copied");
      copyBtn.textContent = tr("copied_btn");
      setTimeout(() => { copyBtn.classList.remove("copied"); copyBtn.textContent = tr("copy_btn"); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastOutput).then(done).catch(fallbackCopy);
    } else { fallbackCopy(); }
    function fallbackCopy() {
      try {
        const ta = document.createElement("textarea");
        ta.value = lastOutput; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
        done();
      } catch (_) { /* ignore */ }
    }
  }

  function doDownload() {
    if (lastEmpty) return;
    const { obj } = buildObject();
    const json = jsonLdSafe(JSON.stringify(obj, null, 2));
    const blob = new Blob([json], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = currentType.toLowerCase() + "-schema.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- wiring ---------- */
  formFields.addEventListener("input", onInput);
  copyBtn.addEventListener("click", doCopy);
  downloadBtn.addEventListener("click", doDownload);
  document.querySelectorAll(".seg-btn").forEach((b) => {
    b.addEventListener("click", () => {
      currentFmt = b.getAttribute("data-fmt");
      document.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("active", x === b));
      onInput();
    });
  });
  document.querySelectorAll(".lang-btn").forEach((b) => {
    b.addEventListener("click", () => applyLang(b.getAttribute("data-lang")));
  });

  /* ---------- boot ---------- */
  try {
    const savedType = localStorage.getItem(STORAGE_TYPE);
    if (savedType && TYPE_MAP[savedType]) currentType = savedType;
  } catch (_) { /* ignore */ }
  currentLang = pickInitialLang();
  applyStaticI18n();
  renderTypebar();
  renderForm();
})();
