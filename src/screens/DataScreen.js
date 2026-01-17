/*
 * DataScreen.js
 *
 * A simple screen to fetch and display raw data in a list format.
 * Likely used for testing data connectivity independent of the main HomeScreen complex UI.
 *
 * Key Features:
 * - Fetch data on mount using `fetchData` service.
 * - Loading and Error states.
 * - Simple Card display for Temperature and Humidity.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { fetchData } from '../api/dataService';

/**
 * Component to render individual data items in the list.
 */
const DataItem = ({ item }) => (
  <View style={styles.itemContainer}>
    <Text style={styles.location}>{item.deviceId}</Text>
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>Temperature:</Text>
      <Text style={styles.dataValue}>{item.temperature}°C</Text>
    </View>
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>Humidity:</Text>
      <Text style={styles.dataValue}>{item.humidity}%</Text>
    </View>
  </View>
);

const DataScreen = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data when component mounts
    const getData = async () => {
      try {
        const fetchedData = await fetchData();
        setData(fetchedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  // Loading State
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Loaded State
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Data</Text>
      <FlatList
        data={data}
        renderItem={({ item }) => <DataItem item={item} />}
        keyExtractor={item => item.deviceId}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#1E3A8A',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    backgroundColor: '#FFC371',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  location: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dataLabel: {
    fontSize: 18,
    color: '#333',
  },
  dataValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    flexShrink: 1, // Prevent overflow
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
  },
});

export default DataScreen;