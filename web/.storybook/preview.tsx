import 'src/global.css';

import React from 'react';

import Box from '@mui/material/Box';

import { I18nProvider } from 'src/locales/i18n-provider';
import { ThemeProvider } from 'src/theme/theme-provider';
import { defaultSettings, SettingsProvider } from 'src/components/settings';

import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <I18nProvider>
        <SettingsProvider settings={defaultSettings}>
          <ThemeProvider>
            <Box sx={{ p: 3 }}>
              <Story />
            </Box>
          </ThemeProvider>
        </SettingsProvider>
      </I18nProvider>
    ),
  ],
};

export default preview;
