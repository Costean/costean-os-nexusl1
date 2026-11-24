import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
document.documentElement.dataset.theme = 'dark';
// After a web-UI update a browser can keep the old page; if the miner's version.json differs from this build, reload once.
fetch('version.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(v => {
  const k = 'costean.wwwReload';
  if (v?.www && typeof __WWW_VERSION__ !== 'undefined' && v.www !== __WWW_VERSION__ && sessionStorage.getItem(k) !== v.www) { sessionStorage.setItem(k, v.www); location.reload(); }
}).catch(() => {});
mount(App, { target: document.getElementById('app') });
