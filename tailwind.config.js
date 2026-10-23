const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: c('canvas'),
        surface: c('surface'),
        subtle: c('subtle'),
        ink: { DEFAULT: c('ink'), soft: c('ink-soft') },
        muted: c('muted'),
        line: { DEFAULT: c('line'), strong: c('line-strong') },
        accent: {
          DEFAULT: c('accent'),
          strong: c('accent-strong'),
          soft: c('accent-soft'),
          ink: c('accent-ink'),
        },
        primary: {
          DEFAULT: c('primary'),
          strong: c('primary-strong'),
          soft: c('primary-soft'),
          ink: c('primary-ink'),
        },
        success: { DEFAULT: c('success'), soft: c('success-soft') },
        warning: { DEFAULT: c('warning'), soft: c('warning-soft') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
        info: { DEFAULT: c('info'), soft: c('info-soft') },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.05)',
        overlay: '0 12px 32px rgb(16 24 40 / 0.14), 0 2px 6px rgb(16 24 40 / 0.06)',
      },
    },
  },
};
