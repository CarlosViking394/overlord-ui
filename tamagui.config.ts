/**
 * Tamagui Configuration for Overlord UI
 */

import { createTamagui } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens } from '@tamagui/themes';
import { createInterFont } from '@tamagui/font-inter';

const interFont = createInterFont();

const config = createTamagui({
    defaultTheme: 'light',
    shouldAddPrefersColorThemes: true,
    themeClassNameOnRoot: true,
    shorthands,
    fonts: {
        heading: interFont,
        body: interFont,
    },
    themes,
    tokens,
});

export type AppConfig = typeof config;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
