import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'DSA Preparation Tracker',
  description: 'Master DSA with a personalised comprehensive plan',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DSA⁴⁰⁴',
  },
  icons: {
    icon: '/app-icon-circular.png',
    apple: '/app-icon-circular.png',
    shortcut: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2ead8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a160e' },
  ],
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
}

const antiFoucScript = `
(function() {
  try {
    var doc = document.documentElement;
    doc.classList.add('disable-transitions');

    var mode = localStorage.getItem('dsa-theme-mode');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = mode === 'dark' || ((!mode || mode === 'system') && prefersDark);
    
    if (isDark) {
      doc.classList.add('dark');
      doc.classList.remove('light');
      doc.style.colorScheme = 'dark';
    } else {
      doc.classList.add('light');
      doc.classList.remove('dark');
      doc.style.colorScheme = 'light';
    }

    var savedTheme = localStorage.getItem('dsa-tracker-theme-custom');
    if (savedTheme) {
      try {
        var parsed = JSON.parse(savedTheme);
        var activeColors = parsed && parsed.colors ? (isDark ? parsed.colors.dark : parsed.colors.light) : null;
        if (activeColors) {
          function hexToRgb(hex) {
            var n = parseInt(hex.replace('#', ''), 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
          }
          function rgbToOklch(r, g, b) {
            var lin = function(c) {
              var v = c / 255;
              return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            };
            var lr = lin(r), lg = lin(g), lb = lin(b);
            var x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
            var y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
            var z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;
            var lc = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
            var mc = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
            var sc = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);
            var L = 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc;
            var a = 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc;
            var bk = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc;
            var C = Math.sqrt(a * a + bk * bk);
            var H = Math.atan2(bk, a) * (180 / Math.PI);
            var hue = H < 0 ? H + 360 : H;
            return 'oklch(' + L.toFixed(3) + ' ' + C.toFixed(4) + ' ' + hue.toFixed(1) + ')';
          }
          function toOklch(hex) {
            var rgb = hexToRgb(hex);
            return rgbToOklch(rgb[0], rgb[1], rgb[2]);
          }

          var bg = toOklch(activeColors.background);
          var fg = toOklch(activeColors.foreground);
          var pr = toOklch(activeColors.primary);
          var cd = toOklch(activeColors.card);
          var mt = toOklch(activeColors.muted);
          var bd = toOklch(activeColors.border);
          var prFg = isDark ? fg : 'oklch(0.98 0.008 85)';

          doc.style.setProperty('--background', bg);
          doc.style.setProperty('--foreground', fg);
          doc.style.setProperty('--card', cd);
          doc.style.setProperty('--card-foreground', fg);
          doc.style.setProperty('--popover', cd);
          doc.style.setProperty('--popover-foreground', fg);
          doc.style.setProperty('--primary', pr);
          doc.style.setProperty('--primary-foreground', prFg);
          doc.style.setProperty('--secondary', mt);
          doc.style.setProperty('--secondary-foreground', fg);
          doc.style.setProperty('--muted', mt);
          doc.style.setProperty('--border', bd);
          doc.style.setProperty('--input', bd);
          doc.style.setProperty('--ring', pr);
          doc.style.setProperty('--sidebar', cd);
          doc.style.setProperty('--sidebar-foreground', fg);
          doc.style.setProperty('--sidebar-primary', pr);
          doc.style.setProperty('--sidebar-primary-foreground', prFg);
          doc.style.setProperty('--sidebar-accent', mt);
          doc.style.setProperty('--sidebar-accent-foreground', fg);
          doc.style.setProperty('--sidebar-border', bd);
          doc.style.setProperty('--sidebar-ring', pr);
        }
      } catch(e) {}
    }

    var savedFont = localStorage.getItem('dsa-tracker-font');
    if (savedFont) {
      doc.style.setProperty('--font-sans', savedFont);
      doc.style.fontFamily = savedFont;
      var match = savedFont.match(/'([^']+)'/);
      var fontName = match ? match[1] : null;
      if (fontName && fontName !== 'Inter' && fontName !== 'Geist') {
        var id = 'gf-' + fontName.replace(/\\s/g, '');
        if (!document.getElementById(id)) {
          var link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(fontName) + ':wght@400;500;600;700;900&display=swap';
          document.head.appendChild(link);
        }
      }
    }

    var savedSize = localStorage.getItem('dsa-tracker-font-size');
    if (savedSize && savedSize !== 'auto') {
      doc.style.fontSize = savedSize;
    } else {
      doc.style.fontSize = '';
    }

    var savedView = localStorage.getItem('dsa-tracker-force-view');
    if (savedView === 'desktop') {
      var meta = document.querySelector('meta[name="viewport"]');
      if (meta) meta.setAttribute('content', 'width=1280');
    }

    setTimeout(function() {
      doc.classList.remove('disable-transitions');
    }, 150);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Synchronous anti-FOUC script — applies saved theme, custom colors, and typography before paint */}
        <script dangerouslySetInnerHTML={{ __html: antiFoucScript }} />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

