import { StyleSheet } from 'react-native';

export const sharedStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
  addButton: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#8E8E93', fontSize: 14, textAlign: 'center', paddingVertical: 10 },
  removeBtn: { padding: 8 },
  removeBtnText: { color: '#FF3B30', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  required: { color: '#FF3B30' },
  input: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, color: '#000', backgroundColor: '#F9F9F9',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#E5E5EA', alignItems: 'center' },
  btnCancelText: { fontSize: 16, fontWeight: '600', color: '#000' },
  btnSave: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#007AFF', alignItems: 'center' },
  btnSaveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnDisabled: { backgroundColor: '#C7C7CC' },
});
