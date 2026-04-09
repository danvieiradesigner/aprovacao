/**
 * Central theme configuration for Attivos layout.
 * This is the SINGLE source of truth for all colors in the application.
 */

export const theme = {
  colors: {
    // Brand Colors (Indigo/Navy)
    brand: {
      primary: '#6366f1',    // Main Indigo
      secondary: '#818cf8',  // Light Indigo
      dark: '#4f46e5',       // Dark Indigo
      glow: 'rgba(99, 102, 241, 0.2)',
    },
    
    // Background colors
    bg: {
      main: '#080d1a',       // Deep Navy
      sidebar: '#0f172a',    // Dark Navy
      card: '#111827',       // Slate 950
      input: '#1e293b',      // Slate 800
      overlay: 'rgba(0, 0, 0, 0.6)',
    },
    
    // Text colors
    text: {
      primary: '#f8fafc',    // Slate 50
      secondary: '#94a3b8',  // Slate 400
      muted: '#475569',      // Slate 600
    },
    
    // Borders & UI Elements
    ui: {
      border: 'rgba(255, 255, 255, 0.06)',
      glass: 'rgba(15, 23, 42, 0.7)',
    },
    
    // Semantic Colors (Preserved as per user request)
    status: {
      success: {
        bg: 'rgba(16, 185, 129, 0.1)',    // Emerald 500 alpha
        text: '#10b981',                  // Emerald 500
        border: 'rgba(16, 185, 129, 0.2)',
      },
      warning: {
        bg: 'rgba(245, 158, 11, 0.1)',    // Amber 500 alpha
        text: '#f59e0b',                  // Amber 500
        border: 'rgba(245, 158, 11, 0.2)',
      },
      danger: {
        bg: 'rgba(239, 68, 68, 0.1)',      // Red 500 alpha
        text: '#ef4444',                  // Red 500
        border: 'rgba(239, 68, 68, 0.2)',
      },
      info: {
        bg: 'rgba(59, 130, 246, 0.1)',     // Blue 500 alpha
        text: '#3b82f6',                  // Blue 500
        border: 'rgba(59, 130, 246, 0.2)',
      }
    }
  }
};

export default theme;
