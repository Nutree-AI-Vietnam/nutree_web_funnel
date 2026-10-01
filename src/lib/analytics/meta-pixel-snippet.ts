import { META_IDENTITY_STORAGE_KEY } from './meta-identity';

/** Base pixel: disable auto-detected events, init with stored AM if the tab already has a lead. */
export function metaPixelBootstrapScript(pixelId: string): string {
  if (!/^\d+$/.test(pixelId)) return '';
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('set','autoConfig',false,'${pixelId}');
var u={};
try{var r=sessionStorage.getItem('${META_IDENTITY_STORAGE_KEY}');if(r){var p=JSON.parse(r);if(p&&typeof p.em==='string'&&p.em.indexOf('@')>0)u.em=String(p.em).toLowerCase().slice(0,254);if(p&&typeof p.external_id==='string'&&/^[A-Za-z0-9._:-]{8,80}$/.test(p.external_id))u.external_id=p.external_id;if(p&&typeof p.fn==='string'){var fn=String(p.fn).toLowerCase().slice(0,32);if(fn.length>=2)u.fn=fn}}}catch(e){}
fbq('init','${pixelId}',u);
fbq('track','PageView');`;
}
