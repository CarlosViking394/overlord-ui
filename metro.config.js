const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Don't transform the @elevenlabs/client package with Hermes
// as it uses import.meta which isn't supported
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === '@elevenlabs/client') {
        // Let the web bundler handle this natively
        return context.resolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
