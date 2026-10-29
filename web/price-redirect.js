'use strict';
const target=new URL('./index.html',location.href);const lang=new URLSearchParams(location.search).get('lang');if(lang==='en'||lang==='ar')target.searchParams.set('lang',lang);target.hash='/payment/pay-price';location.replace(target.href);
