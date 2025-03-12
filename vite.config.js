import { defineConfig } from 'vite'

// For GitHub Pages compatibility
const scriptToInject = `
<script>
  // Fix for GitHub Pages - check if we're on GitHub Pages and load the Agora SDK from CDN if needed
  if (window.location.href.includes('/sneak/') && !window.location.href.includes('localhost') && !window.AgoraRTC) {
    const scriptCDN = document.createElement('script');
    scriptCDN.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.23.2.js';
    document.head.appendChild(scriptCDN);
  }
</script>
`;

export default defineConfig({
  base: '/sneak/',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  plugins: [
    {
      name: 'inject-html-script',
      transformIndexHtml(html) {
        return html.replace('</head>', `${scriptToInject}</head>`);
      }
    }
  ]
}) 