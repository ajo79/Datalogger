/*
 * SettingsScreen.js
 *
 * Displays application settings.
 * Currently a placeholder with a "Notifications" toggle example.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Image,
    ImageBackground,
    Switch,
    TouchableOpacity,
    ScrollView
} from 'react-native';

export default function SettingsScreen({ navigation }) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <ImageBackground
                source={require("../../assets/images/WaveTop.png")}
                style={styles.header}
                resizeMode="cover"
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image
                            source={require("../../assets/images/BackIcon.png")}
                            style={styles.backIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Settings</Text>
                    <View style={{ width: 32 }} /> {/* Spacer for balance */}
                </View>
            </ImageBackground>

            {/* Content */}
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Setting Item: Notifications */}
                <View style={styles.settingRow}>
                    <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Notifications</Text>
                        <Text style={styles.settingDesc}>Enable push notifications for alarms</Text>
                    </View>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                        trackColor={{ false: "#767577", true: "#f4a020" }}
                    />
                </View>

                <View style={styles.divider} />

                {/* Setting Item: Dark Mode (Dummy) */}
                <View style={styles.settingRow}>
                    <View style={styles.settingTextContainer}>
                        <Text style={styles.settingLabel}>Dark Mode</Text>
                        <Text style={styles.settingDesc}>Switch visuals to dark theme</Text>
                    </View>
                    <Switch
                        value={darkMode}
                        onValueChange={setDarkMode}
                        trackColor={{ false: "#767577", true: "#f4a020" }}
                    />
                </View>

                <View style={styles.divider} />

                {/* Setting Item: Version */}
                <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>App Version</Text>
                    <Text style={styles.settingValue}>1.0.0</Text>
                </View>

            </ScrollView>

            {/* Footer */}
            <ImageBackground
                source={require("../../assets/images/WaveBottom.png")}
                style={styles.footer}
                resizeMode="cover"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        height: 80,
        justifyContent: 'flex-end',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    backIcon: {
        width: 32,
        height: 32,
        resizeMode: "contain"
    },
    scrollContent: {
        padding: 20,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
    },
    settingTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    settingLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    settingDesc: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    settingValue: {
        fontSize: 16,
        color: '#888',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
    },
    footer: {
        height: 80,
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
});
