import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Search, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AgentActivites() {
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');

  const filteredActivities = (user?.activities || []).filter((act: any) => {
    const query = searchText.toLowerCase().trim();
    if (!query) return true;
    return (
      act.nom.toLowerCase().includes(query) ||
      (act.description && act.description.toLowerCase().includes(query))
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Activités Attribuées</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Actes civils que vous êtes habilité(e) à traiter</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={18} color="#8c9ba5" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher une activité..."
            placeholderTextColor="#8c9ba5"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')} style={{ padding: 4 }}>
              <X size={16} color="#8c9ba5" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredActivities.length > 0 ? (
          filteredActivities.map((act: any) => (
            <View key={act.id} style={[styles.activityCard, { backgroundColor: theme.card }]}>
              <View style={[styles.activityIconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                <FileText color="#2563eb" size={28} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityName, { color: theme.text }]}>{act.nom}</Text>
                {act.description ? (
                  <Text style={[styles.activityDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    {act.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchText.trim() ? "Aucune activité correspondante trouvée." : "Aucune activité ne vous a été attribuée."}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
    paddingTop: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
