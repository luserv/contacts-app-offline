import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { displayName, MONTH_NAMES_EN, MONTH_NAMES_ES, parseBirthdate } from '../../utils/contactUtils';
import { useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';

interface BirthdayEntry {
  contact_id: string;
  first_name: string;
  middle_name?: string;
  surname: string;
  birthYear: number;
}

const DAY_HEADERS = {
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default function CalendarScreen() {
  const { lang } = useI18n();
  const { contacts } = useContacts();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const MONTH_NAMES = lang === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const monthLabel = (m: number) => MONTH_NAMES[m - 1].charAt(0).toUpperCase() + MONTH_NAMES[m - 1].slice(1);

  const birthdayMap = useMemo(() => {
    const map = new Map<string, BirthdayEntry[]>();
    for (const c of contacts) {
      if (!c.birthdate) continue;
      const parsed = parseBirthdate(c.birthdate);
      if (!parsed) continue;
      const key = `${parsed.month}-${parsed.day}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({
        contact_id: c.contact_id,
        first_name: c.first_name,
        middle_name: c.middle_name,
        surname: c.surname,
        birthYear: parsed.year,
      });
    }
    return map;
  }, [contacts]);

  const getBirthdays = (day: number) => birthdayMap.get(`${viewMonth}-${day}`) ?? [];

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cellSize = Math.floor((width - 24) / 7);

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() + 1 &&
    viewYear === today.getFullYear();

  const openDay = (day: number) => {
    const bdays = getBirthdays(day);
    if (bdays.length === 0) return;
    setSelectedDay(day);
    setModalVisible(true);
  };

  const selectedBirthdays = selectedDay ? getBirthdays(selectedDay) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={10}>
          <ChevronLeft size={22} color="#333" />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel(viewMonth)} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={10}>
          <ChevronRight size={22} color="#333" />
        </Pressable>
      </View>

      <View style={styles.dowRow}>
        {DAY_HEADERS[lang].map(d => (
          <View key={d} style={[styles.dowCell, { width: cellSize }]}>
            <Text style={styles.dowText}>{d}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((day, ci) => {
              if (day === null) {
                return <View key={ci} style={[styles.cell, { width: cellSize, height: cellSize }]} />;
              }
              const birthdays = getBirthdays(day);
              const hasBday = birthdays.length > 0;
              const todayCell = isToday(day);
              return (
                <Pressable
                  key={ci}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                    todayCell && styles.cellToday,
                    hasBday && !todayCell && styles.cellHasBday,
                  ]}
                  onPress={() => openDay(day)}
                  android_ripple={hasBday ? { color: '#f5a62340', borderless: true } : undefined}
                >
                  <Text style={[
                    styles.dayNum,
                    todayCell && styles.dayNumToday,
                    !hasBday && styles.dayNumEmpty,
                  ]}>
                    {day}
                  </Text>
                  {hasBday && (
                    <View style={styles.dotsRow}>
                      {birthdays.slice(0, 3).map((_, i) => (
                        <View key={i} style={[styles.dot, todayCell && styles.dotToday]} />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>
          {lang === 'es' ? 'Tiene cumpleaños' : 'Has birthday'}
        </Text>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {selectedDay} {selectedDay ? monthLabel(viewMonth) : ''}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <X size={20} color="#666" />
              </Pressable>
            </View>
            <ScrollView>
              {selectedBirthdays.map(e => {
                const age = viewYear - e.birthYear;
                return (
                  <Pressable
                    key={e.contact_id}
                    style={styles.contactRow}
                    onPress={() => { setModalVisible(false); router.push(`/contact/${e.contact_id}`); }}
                  >
                    <Text style={styles.cakeEmoji}>🎂</Text>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName} numberOfLines={1}>{displayName(e)}</Text>
                      <Text style={styles.contactAge}>
                        {lang === 'es'
                          ? `Cumple ${age} año${age !== 1 ? 's' : ''}`
                          : `Turns ${age} year${age !== 1 ? 's' : ''}`}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#ccc" />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f6f6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  dowRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  dowCell: { alignItems: 'center' },
  dowText: { fontSize: 11, fontWeight: '600', color: '#999', textTransform: 'uppercase' },
  grid: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginVertical: 3 },
  cellToday: { backgroundColor: '#1a73e8' },
  cellHasBday: { backgroundColor: '#fff8ee', borderWidth: 1, borderColor: '#f5a62360' },
  dayNum: { fontSize: 14, fontWeight: '600', color: '#333' },
  dayNumToday: { color: '#fff' },
  dayNumEmpty: { color: '#ccc', fontWeight: '400' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#f5a623' },
  dotToday: { backgroundColor: '#fff' },
  legend: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff',
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f5a623' },
  legendText: { fontSize: 12, color: '#888' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '65%', paddingBottom: 32,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: '#f4f4f4',
  },
  cakeEmoji: { fontSize: 22, marginRight: 14 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '600', color: '#222' },
  contactAge: { fontSize: 12, color: '#888', marginTop: 2 },
});
