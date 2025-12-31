import React from 'react';
import { View, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SimpleLoginScreen } from './src/screens/SimpleLoginScreen';
import { SimpleDashboardScreen } from './src/screens/SimpleDashboardScreen';
import { AuthProvider, useAuth } from './src/store/AuthContext';

function AppContent() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <SimpleDashboardScreen />;
    }

    return <SimpleLoginScreen />;
}

function App() {
    return (
        <AuthProvider>
            <View style={styles.container}>
                <AppContent />
                <StatusBar style="auto" />
            </View>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});

export default App;

registerRootComponent(App);
