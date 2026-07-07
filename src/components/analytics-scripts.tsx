'use client';

import Script from 'next/script';

const GA4 = process.env.NEXT_PUBLIC_GA4_ID;
const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const TIKTOK = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const AB_APP = process.env.NEXT_PUBLIC_AIRBRIDGE_APP_NAME;
const AB_TOKEN = process.env.NEXT_PUBLIC_AIRBRIDGE_WEB_TOKEN;

export function AnalyticsScripts() {
  return (
    <>
      {GA4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA4}');`}
          </Script>
        </>
      )}
      {META && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META}'); fbq('track', 'PageView');`}
        </Script>
      )}
      {TIKTOK && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${TIKTOK}'); ttq.page();
          }(window, document, 'ttq');`}
        </Script>
      )}
      {AB_APP && AB_TOKEN && (
        <Script id="airbridge" strategy="afterInteractive">
          {`(function(a_,i_,r_,_b,_r,_i,_d,_g,_e){if(!a_[_b]){var n=function(){var c=i_.createElement(r_);c.onerror=function(){h.queue.filter(function(t){return 0<=_d.indexOf(t[0])}).forEach(function(t){t=t[1];t=t[t.length-1];"function"==typeof t&&t("error occur when load airbridge")})};c.async=1;c.src=_r;"complete"===i_.readyState?i_.head.appendChild(c):a_.addEventListener("load",function t(){a_.removeEventListener("load",t);i_.head.appendChild(c)})},h={queue:[],get isSDKEnabled(){return!1}};_i.concat(_d).forEach(function(t){var e=t.split("."),c=e.pop();e.reduce(function(t,e){return t[e]=t[e]||{}},h)[c]=function(){h.queue.push([t,arguments])}});a_[_b]=h;0<_g?(_e=setInterval(function(){0<--_g?a_[_b].isSDKEnabled&&(clearInterval(_e),n()):(clearInterval(_e),n())},1e3)):n()}})(window,document,"script","airbridge","https://static.airbridge.io/sdk/latest/airbridge.min.js",["init","startTracking","fetchResource","setBanner","setDownload","setDownloads","setDeeplinks","sendWeb","setUserAgent","setMobileAppData","setUserId","setUserEmail","setUserPhone","setUserAttributes","clearUser","setDeviceIFV","setDeviceIFA","setDeviceGAID","events.send","events.signIn","events.signUp","events.signOut","events.purchased","events.addedToCart","events.productDetailsViewReceived","events.homeViewed","events.productListViewed","events.searchResultViewed"],[],0);
          airbridge.init({ app: '${AB_APP}', webToken: '${AB_TOKEN}' });`}
        </Script>
      )}
    </>
  );
}
