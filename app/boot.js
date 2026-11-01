// Applies the shared theme before first paint (same key as the map: localStorage 'uqmap-theme').
try { var t = localStorage.getItem('uqmap-theme'); if (t === 'light' || t === 'comfort' || t === 'dark') document.documentElement.dataset.theme = t; else if (!matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'comfort'; } catch (e) { }
