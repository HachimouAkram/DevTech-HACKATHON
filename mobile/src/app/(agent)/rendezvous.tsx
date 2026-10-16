import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, TextInput, Platform, Modal } from 'react-native';
import { apiFetch } from '../../services/apiClient';
import { useTheme } from '../../hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, Check, X, UserCheck, UserX, User, FileText, Search } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../context/ThemeContext';

export default function AgentRendezvousScreen() {
  const [rendezvous, setRendezvous] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [tempDateObj, setTempDateObj] = useState<Date | null>(null);
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const handleOpenDatePicker = () => {
    setTempDateObj(selectedDateObj || new Date());
    setShowDatePicker(true);
  };

  const handleConfirmDate = () => {
    if (tempDateObj) {
      setSelectedDateObj(tempDateObj);
      const day = String(tempDateObj.getDate()).padStart(2, '0');
      const month = String(tempDateObj.getMonth() + 1).padStart(2, '0');
      const year = tempDateObj.getFullYear();
      setSearchDate(`${day}/${month}/${year}`);
    }
    setShowDatePicker(false);
  };

  const handleClearDate = () => {
    setSearchDate('');
    setSelectedDateObj(null);
    setTempDateObj(null);
    setShowDatePicker(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        setSelectedDateObj(selectedDate);
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        setSearchDate(`${day}/${month}/${year}`);
      }
    } else {
      if (selectedDate) {
        setTempDateObj(selectedDate);
      }
    }
  };

  const isTodaySelected = React.useMemo(() => {
    if (!selectedDateObj) return false;
    const today = new Date();
    return selectedDateObj.getDate() === today.getDate() &&
           selectedDateObj.getMonth() === today.getMonth() &&
           selectedDateObj.getFullYear() === today.getFullYear();
  }, [selectedDateObj]);

  const handleSelectToday = () => {
    if (isTodaySelected) {
      handleClearDate();
    } else {
      const today = new Date();
      setSelectedDateObj(today);
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      setSearchDate(`${day}/${month}/${year}`);
    }
  };

  useEffect(() => {
    fetchRendezvous(true);
  }, []);

  const fetchRendezvous = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await apiFetch('/rendez-vous/agent');
      if (res && res.data) {
        setRendezvous(res.data);
      }
    } catch (err) {
      console.warn('Erreur fetch rendezvous:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateRendezvousStatus = async (id: number, newStatut: string) => {
    try {
      await apiFetch(`/rendez-vous/${id}/statut`, {
        method: 'PATCH',
        bodyData: { statut: newStatut }
      });
      Alert.alert('Succès', `Le rendez-vous a été mis à jour.`);
      fetchRendezvous(false);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de mettre à jour le statut.');
    }
  };

  const getStatusStyle = (statut: string) => {
    const s = statut?.toUpperCase();
    switch (s) {
      case 'CONFIRME': return { color: '#2563eb', bg: '#dbeafe', label: 'Confirmé' };
      case 'EFFECTUE': return { color: '#16a34a', bg: '#dcfce7', label: 'Effectué' };
      case 'ABSENT': return { color: '#dc2626', bg: '#fee2e2', label: 'Absent' };
      case 'ANNULE': return { color: '#dc2626', bg: '#fee2e2', label: 'Annulé' };
      case 'REPORTE': return { color: '#d97706', bg: '#fef3c7', label: 'Reporté' };
      default: return { color: '#4b5563', bg: '#f3f4f6', label: statut || 'En attente' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  const filteredRendezvous = rendezvous.filter((rdv: any) => {
    const query = searchText.toLowerCase().trim();
    if (query) {
      const matchQuery = (
        (rdv.numeroRendezVous && rdv.numeroRendezVous.toLowerCase().includes(query)) ||
        (rdv.demandeReference && rdv.demandeReference.toLowerCase().includes(query)) ||
        (rdv.citoyenNom && rdv.citoyenNom.toLowerCase().includes(query)) ||
        (rdv.citoyenTelephone && rdv.citoyenTelephone.includes(query)) ||
        (rdv.activiteNom && rdv.activiteNom.toLowerCase().includes(query)) ||
        (rdv.centreNom && rdv.centreNom.toLowerCase().includes(query))
      );
      if (!matchQuery) return false;
    }

    if (selectedDateObj) {
      if (!rdv.date) return false;
      const targetYear = selectedDateObj.getFullYear();
      const targetMonth = selectedDateObj.getMonth();
      const targetDate = selectedDateObj.getDate();
      
      const parts = rdv.date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const date = parseInt(parts[2]);
        return year === targetYear && month === targetMonth && date === targetDate;
      }
      return false;
    }

    return true;
  });

  const renderItem = ({ item }: { item: any }) => {
    const status = getStatusStyle(item.statut);
    
    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              RDV N° {item.numeroRendezVous || 'Inconnu'}
            </Text>
            {item.demandeReference && (
              <Text style={[styles.referenceText, { color: theme.textSecondary }]}>
                Réf: {item.demandeReference}
              </Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Separator */}
        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {item.activiteNom && (
            <View style={styles.infoRow}>
              <FileText size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                {item.activiteNom}
              </Text>
            </View>
          )}

          {item.citoyenNom && (
            <View style={styles.infoRow}>
              <User size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {item.citoyenNom} {item.citoyenTelephone ? `(${item.citoyenTelephone})` : ''}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Calendar size={16} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {formatDate(item.date)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={16} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {formatTime(item.heure)}
            </Text>
          </View>

          {item.centreNom && (
            <View style={styles.infoRow}>
              <MapPin size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.centreNom}
              </Text>
            </View>
          )}
        </View>

        {/* Actions Section */}
        {!(item.statut === 'ANNULE' || item.statut === 'EFFECTUE' || item.statut === 'ABSENT') && (
          <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
            {item.statut !== 'CONFIRME' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnConfirm]}
                onPress={() => {
                  Alert.alert(
                    'Confirmer',
                    'Voulez-vous vraiment confirmer ce rendez-vous ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Confirmer', onPress: () => updateRendezvousStatus(item.id, 'CONFIRME') }
                    ]
                  );
                }}
              >
                <Check size={16} color="#16a34a" />
                <Text style={styles.actionBtnTextConfirm}>Confirmer</Text>
              </TouchableOpacity>
            )}

            {(item.statut === 'CONFIRME' || item.statut === 'REPORTE') && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnPresent]}
                  onPress={() => {
                    Alert.alert(
                      'Présent',
                      'Marquer ce citoyen comme Présent ?',
                      [
                        { text: 'Non', style: 'cancel' },
                        { text: 'Oui, Présent', onPress: () => updateRendezvousStatus(item.id, 'EFFECTUE') }
                      ]
                    );
                  }}
                >
                  <UserCheck size={16} color="#16a34a" />
                  <Text style={styles.actionBtnTextPresent}>Présent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnAbsent]}
                  onPress={() => {
                    Alert.alert(
                      'Absent',
                      'Marquer ce citoyen comme Absent ?',
                      [
                        { text: 'Non', style: 'cancel' },
                        { text: 'Oui, Absent', onPress: () => updateRendezvousStatus(item.id, 'ABSENT') }
                      ]
                    );
                  }}
                >
                  <UserX size={16} color="#dc2626" />
                  <Text style={styles.actionBtnTextAbsent}>Absent</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.btnCancel]}
              onPress={() => {
                Alert.alert(
                  'Annuler',
                  'Voulez-vous vraiment annuler ce rendez-vous ?',
                  [
                    { text: 'Non', style: 'cancel' },
                    { text: 'Oui, Annuler', onPress: () => updateRendezvousStatus(item.id, 'ANNULE') }
                  ]
                );
              }}
            >
              <X size={16} color="#dc2626" />
              <Text style={styles.actionBtnTextCancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Agenda des Rendez-vous</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Gérez les présences et confirmations physiques</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border, flex: 2 }]}>
            <Search size={18} color="#8c9ba5" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text, flex: 1 }]}
              placeholder="Rechercher par réf, nom..."
              placeholderTextColor="#8c9ba5"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity 
            style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border, flex: 1.5 }]}
            onPress={handleOpenDatePicker}
            activeOpacity={0.7}
          >
            <Calendar size={18} color="#8c9ba5" style={{ marginRight: 8 }} />
            <Text style={{ color: searchDate ? theme.text : '#8c9ba5', fontSize: 15, flex: 1 }} numberOfLines={1}>
              {searchDate || "Date exacte"}
            </Text>
            {searchDate ? (
              <TouchableOpacity onPress={handleClearDate} style={{ padding: 4 }}>
                <X size={16} color="#8c9ba5" />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
          <TouchableOpacity
            style={[
              styles.todayBtn,
              isTodaySelected
                ? styles.todayBtnActive
                : { backgroundColor: theme.card, borderColor: theme.border }
            ]}
            onPress={handleSelectToday}
            activeOpacity={0.7}
          >
            <Calendar size={14} color={isTodaySelected ? '#ffffff' : '#2563eb'} style={{ marginRight: 6 }} />
            <Text style={[styles.todayBtnLabel, { color: isTodaySelected ? '#ffffff' : theme.text }]}>
              Aujourd'hui
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DatePicker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent={true} animationType="fade" visible={showDatePicker}>
            <TouchableOpacity 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} 
              activeOpacity={1} 
              onPress={() => setShowDatePicker(false)}
            >
              <View 
                style={{ backgroundColor: theme.card, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                onStartShouldSetResponder={() => true}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
                  <TouchableOpacity onPress={handleClearDate}>
                    <Text style={{ color: '#ef4444', fontSize: 16 }}>Effacer</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Choisir une date</Text>
                  <TouchableOpacity onPress={handleConfirmDate}>
                    <Text style={{ color: '#2563eb', fontSize: 16, fontWeight: '700' }}>Valider</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDateObj || new Date()}
                  mode="date"
                  display="inline"
                  onChange={handleDateChange}
                  themeVariant={activeTheme as 'light' | 'dark'}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDateObj || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={filteredRendezvous}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchRendezvous(false)} colors={['#2563eb']} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 16 }}>
                {searchDate
                  ? `Aucun rendez-vous le ${searchDate}`
                  : searchText.trim()
                  ? "Aucun rendez-vous correspondant."
                  : "Aucun rendez-vous planifié."}
              </Text>
              {(searchDate || searchText.trim()) && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: '#2563eb',
                  }}
                  onPress={() => { setSearchDate(''); setSelectedDateObj(null); setSearchText(''); }}
                  activeOpacity={0.8}
                >
                  <X size={14} color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#2563eb', fontWeight: '600', fontSize: 14 }}>Effacer les filtres</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  listContainer: { padding: 24, gap: 16, paddingBottom: 80, paddingTop: 8 },
  card: { padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  referenceText: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  separator: { height: 1, marginVertical: 8, opacity: 0.4 },
  detailsContainer: { gap: 8, marginVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, flex: 1 },
  actionsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, marginTop: 12, gap: 8, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  btnConfirm: { borderColor: 'rgba(22, 163, 74, 0.2)', backgroundColor: 'rgba(22, 163, 74, 0.05)' },
  btnPresent: { borderColor: 'rgba(22, 163, 74, 0.2)', backgroundColor: 'rgba(22, 163, 74, 0.05)' },
  btnAbsent: { borderColor: 'rgba(220, 38, 38, 0.2)', backgroundColor: 'rgba(220, 38, 38, 0.05)' },
  btnCancel: { borderColor: 'rgba(220, 38, 38, 0.2)', backgroundColor: 'rgba(220, 38, 38, 0.05)' },
  actionBtnTextConfirm: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  actionBtnTextPresent: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  actionBtnTextAbsent: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  actionBtnTextCancel: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  todayBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  }
});
