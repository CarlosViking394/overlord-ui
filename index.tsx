import { TamaguiProvider, Theme, Text, View, config } from '@agent-charlie/ui-kit';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';

export default function App() {
    return (
        <TamaguiProvider config={config}>
            <Theme name="light">
                <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Overlord UI</Text>
                    <Text>Centralized Design System Active</Text>
                    <StatusBar style="auto" />
                </View>
            </Theme>
        </TamaguiProvider>
    );
}

registerRootComponent(App);
