/* Pixels e tags configurados na aba Integrações do formulário (códigos-base oficiais de cada plataforma) */
import type { Settings } from "@/lib/types";

type W = Window & {
  fbq?: (...a: unknown[]) => void;
  dataLayer?: unknown[];
  gtag?: (...a: unknown[]) => void;
  ttq?: { track: (ev: string, p?: unknown) => void };
};

const clean = (id: string) => id.trim().replace(/[^\w-]/g, "");

function inline(code: string) {
  const s = document.createElement("script");
  s.textContent = code;
  document.head.appendChild(s);
}

let loaded = false;

export function loadTrackers(s: Settings) {
  if (loaded || typeof window === "undefined") return;
  loaded = true;

  if (s.facebookPixel.enabled && clean(s.facebookPixel.id)) {
    inline(`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${clean(s.facebookPixel.id)}');fbq('track','PageView');`);
  }

  if (s.gtm.enabled && clean(s.gtm.id)) {
    inline(`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${clean(s.gtm.id)}');`);
  }

  if (s.ga.enabled && clean(s.ga.id)) {
    const id = clean(s.ga.id);
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(tag);
    inline(`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}');`);
  }

  if (s.tiktok.enabled && clean(s.tiktok.id)) {
    inline(`!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${clean(s.tiktok.id)}');ttq.page();}(window, document, 'ttq');`);
  }
}

/** Evento de conversão: Lead (Meta), generate_lead (GA), SubmitForm (TikTok), form_conversion (GTM) */
export function trackConversion(s: Settings, data: Record<string, unknown>) {
  const w = window as W;
  if (s.facebookPixel.enabled) w.fbq?.("track", "Lead");
  if (s.ga.enabled) w.gtag?.("event", "generate_lead", data);
  if (s.tiktok.enabled) w.ttq?.track("SubmitForm");
  if (s.gtm.enabled) (w.dataLayer = w.dataLayer || []).push({ event: "form_conversion", ...data });
}

/** Evento extra (ex.: clique no WhatsApp do diagnóstico) */
export function trackEvent(s: Settings, metaEvent: string, custom = false) {
  const w = window as W;
  if (s.facebookPixel.enabled) w.fbq?.(custom ? "trackCustom" : "track", metaEvent);
  if (s.ga.enabled) w.gtag?.("event", metaEvent);
  if (s.gtm.enabled) (w.dataLayer = w.dataLayer || []).push({ event: metaEvent });
}
